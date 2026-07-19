import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { validateCoupon, type CouponResult } from '@/lib/coupons';
import type { UtmData } from '@/lib/utm';
import type { CustomerData } from '@/lib/meta-capi';

let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Razorpay caps notes at 15 key-value pairs, 256 chars per value. Everything
// the webhook needs must survive that budget - see docs/RAZORPAY_WEBHOOK_MIGRATION.md §5.
const NOTE_MAX = 256;
const truncate = (v: string | undefined | null, max = NOTE_MAX): string =>
  (v ?? '').slice(0, max);

/**
 * The sentinel that tells our webhook "this payment came from THIS funnel".
 * The merchant's Razorpay account also receives payment links, invoices, and
 * the sibling postpartum funnel; without this gate the webhook would push
 * unrelated payments into Pabbly and Meta.
 */
const FUNNEL_KIND = 'client_prenatal';

/**
 * Serialise an object to JSON that is guaranteed to fit a Razorpay note value.
 * If the full object somehow exceeds the limit, fall back to the caller's
 * reduced shape rather than emitting truncated (unparseable) JSON.
 */
function clipJson<T extends Record<string, string>>(
  obj: T,
  reduce: (o: T) => Partial<T>
): string {
  const full = JSON.stringify(obj);
  if (full.length <= NOTE_MAX) return full;

  const reduced = JSON.stringify(reduce(obj));
  if (reduced.length <= NOTE_MAX) {
    console.warn(`[create-order] note blob ${full.length}b > ${NOTE_MAX} - shed to reduced shape`);
    return reduced;
  }

  console.error(`[create-order] note blob unshrinkable (${reduced.length}b) - emitting {}`);
  return '{}';
}

// Canonical checkout URL for CAPI's event_source_url. Deliberately NOT
// window.location.href - real URLs carry the whole query string and routinely
// blow past Razorpay's 256-char per-value limit. UTMs are preserved separately
// in the `utm` note, so nothing is lost.
const CANONICAL_CHECKOUT_URL = 'https://prenatal.bodyworx.in/checkout';

/**
 * For 100%-off coupons we can't create a Razorpay order (₹0 is below Razorpay's
 * minimum). Instead we mint a server-signed free-order token. verify-payment
 * recomputes this HMAC to confirm the free order is legitimate - without it,
 * a client could fabricate any `free_xxx` order ID and trigger a fake Pabbly
 * webhook. Signing key is RAZORPAY_KEY_SECRET (already server-only).
 */
function signFreeOrder(orderId: string, couponCode: string): string {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${couponCode}|free`)
    .digest('hex');
}

/**
 * Pack customer + attribution data into Razorpay order notes so the webhook
 * can rebuild the full Pabbly + CAPI payload without the browser.
 *
 * `cust` and `utm` are JSON blobs rather than individual keys: 7 customer
 * fields + 6 UTM fields as separate keys would consume the entire 15-key
 * budget and leave nothing for fbc/fbp/ip/ua/esu. Per-field caps keep each
 * blob comfortably under the 256-char ceiling.
 */
function buildNotes(params: {
  customer?: CustomerData;
  utm?: UtmData;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  clientIp?: string;
  clientUserAgent?: string;
  couponCode?: string;
}): Record<string, string> {
  const c = params.customer;
  const u = params.utm ?? {};

  // CRITICAL: these blobs must never be blind-truncated at 256. Cutting a JSON
  // string mid-value produces unparseable JSON, the webhook's parseNote() falls
  // back to {}, and the lead reaches Pabbly with an empty name/email and no
  // CAPI event - a silent loss, which is exactly what this migration exists to
  // prevent. So the per-field caps below are chosen so the WORST CASE always
  // serialises under 256, and clipLength() is a belt-and-braces backstop for
  // anything unexpected (e.g. JSON escaping expanding a value).
  const cust = c
    ? clipJson(
        {
          fn: truncate(c.firstName, 35),
          ln: truncate(c.lastName, 35),
          em: truncate(c.email, 70),
          ph: truncate(c.phone, 15),
          ct: truncate(c.city, 30),
          co: truncate(c.countryCode, 4),
          dl: truncate(c.dialCode, 6),
        },
        // Email is the one field the webhook cannot work without: it drives
        // Pabbly identity AND the CAPI external_id. Keep it if we must shed.
        (o) => ({ em: o.em })
      )
    : '';

  const utm = clipJson(
    {
      s: truncate(u.source, 25),
      m: truncate(u.medium, 25),
      c: truncate(u.campaign, 45),
      n: truncate(u.content, 30),
      t: truncate(u.term, 25),
      i: truncate(u.id, 25),
    },
    (o) => ({ s: o.s, m: o.m, c: o.c })
  );

  return {
    kind: FUNNEL_KIND,
    cust: truncate(cust),
    utm: truncate(utm),
    clid: truncate(params.fbclid),
    fbc: truncate(params.fbc),
    fbp: truncate(params.fbp),
    ip: truncate(params.clientIp, 45),
    // Instagram / Facebook in-app browser UAs routinely exceed 256 chars.
    // Meta's UA matching is prefix-tolerant, so truncation costs ~nothing.
    ua: truncate(params.clientUserAgent),
    esu: CANONICAL_CHECKOUT_URL,
    coupon_code: truncate(params.couponCode, 40),
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('[create-order] Razorpay not configured - missing environment variables');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCoupon = typeof body.couponCode === 'string' ? body.couponCode : '';
    const customer = body.customer as CustomerData | undefined;
    const utm = body.utm as UtmData | undefined;
    const fbclid = typeof body.fbclid === 'string' ? body.fbclid : '';

    let amount: number = CHECKOUT_CONFIG.amountPaise;
    const currency: string = CHECKOUT_CONFIG.currency;
    let coupon: CouponResult | null = null;

    if (rawCoupon.trim()) {
      coupon = validateCoupon(rawCoupon);
      if (coupon.ok) {
        amount = coupon.finalAmountPaise;
      }
    }

    // ── Free-order branch ──────────────────────────────────────────────────
    // Razorpay rejects ₹0 orders. When a coupon makes the order free, we
    // bypass Razorpay entirely and return a signed token. The CheckoutForm
    // skips the Razorpay modal and calls verify-payment directly. No Razorpay
    // order means no webhook ever fires for these - verify-payment stays the
    // tracking path for the free/QA flow only.
    if (coupon && coupon.ok && coupon.finalAmountPaise === 0) {
      const freeOrderId = `free_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const freeOrderToken = signFreeOrder(freeOrderId, coupon.code);
      return NextResponse.json({
        orderId: freeOrderId,
        amount: 0,
        currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        coupon,
        freeOrder: true,
        freeOrderToken,
      });
    }

    // ── Standard paid-order branch ─────────────────────────────────────────
    // Server-side reads. The client never supplies these - cookies come with
    // the request, IP and UA come from the edge.
    const fbc = req.cookies.get('_fbc')?.value;
    const fbp = req.cookies.get('_fbp')?.value;
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      undefined;
    const clientUserAgent = req.headers.get('user-agent') ?? undefined;

    const notes = buildNotes({
      customer,
      utm,
      fbclid,
      fbc,
      fbp,
      clientIp,
      clientUserAgent,
      couponCode: coupon?.ok ? coupon.code : '',
    });

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `receipt_${Date.now()}`,
      notes,
    });

    console.log(`[create-order] order=${order.id} kind=${FUNNEL_KIND} cust=${customer ? 'packed' : 'absent'}`);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      coupon,
      freeOrder: false,
    });
  } catch (error) {
    console.error('[create-order]', error);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
