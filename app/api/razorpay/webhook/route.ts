import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { sendMetaCapiEvent } from '@/lib/meta-capi';

/**
 * POST /api/razorpay/webhook - the tracking authority for paid orders.
 *
 * WHY THIS EXISTS: Pabbly + Meta CAPI used to fire from verify-payment, which
 * the browser calls after the Razorpay modal's success handler returns. UPI
 * payers (GPay/PhonePe/Paytm) routinely complete the payment inside the UPI app
 * and never return to the funnel tab - so that handler never ran, and we
 * silently lost the lead AND the conversion signal even though Razorpay had
 * collected the money. This route is server-to-server: it fires regardless of
 * what the visitor's browser does, and Razorpay retries it on non-200.
 *
 * The free/QA-coupon flow still goes through verify-payment - those orders
 * never touch Razorpay, so no webhook can ever fire for them.
 */

const FUNNEL_KIND = 'client_prenatal';

interface PackedCustomer {
  fn?: string; ln?: string; em?: string; ph?: string;
  ct?: string; co?: string; dl?: string;
}
interface PackedUtm {
  s?: string; m?: string; c?: string; n?: string; t?: string; i?: string;
}

/** Parse a JSON note blob defensively - a malformed note must not 500 us. */
function parseNote<T>(raw: unknown): T {
  if (typeof raw !== 'string' || !raw) return {} as T;
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' ? parsed : {}) as T;
  } catch {
    return {} as T;
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[webhook] CRITICAL: RAZORPAY_WEBHOOK_SECRET not set - cannot verify');
      return NextResponse.json(
        { ok: false, error: 'webhook_not_configured' },
        { status: 500 }
      );
    }

    // ── 1. HMAC signature verify ───────────────────────────────────────────
    // Must read the RAW body. Parsing to JSON and re-serialising changes the
    // bytes (key order, whitespace) and the HMAC will never match.
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      console.error('[webhook] invalid signature - rejecting');
      return NextResponse.json(
        { ok: false, error: 'invalid_signature' },
        { status: 400 }
      );
    }
    console.log('[webhook] signature verified');

    // ── 2. Event filter ────────────────────────────────────────────────────
    const event = JSON.parse(rawBody);
    if (event.event !== 'payment.captured') {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'event_not_captured',
        event: event.event,
      });
    }

    // ── 3. Payment entity ──────────────────────────────────────────────────
    const payment = event.payload?.payment?.entity;
    if (!payment) {
      console.error('[webhook] payment.captured with no payment entity');
      return NextResponse.json(
        { ok: false, error: 'no_payment_entity' },
        { status: 400 }
      );
    }
    const paymentId: string = payment.id;

    // ── 4. Kind gate ───────────────────────────────────────────────────────
    // This Razorpay account also receives the sibling postpartum funnel,
    // payment links, and invoices. Only our orders carry this sentinel.
    const notes = payment.notes ?? {};
    if (notes.kind !== FUNNEL_KIND) {
      console.log(`[webhook] paymentId=${paymentId} ignored - kind=${notes.kind ?? 'none'}`);
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'kind_mismatch',
        kind: notes.kind ?? null,
      });
    }
    console.log(`[webhook] paymentId=${paymentId} kind matched: ${FUNNEL_KIND}`);

    // ── 5. Unpack notes ────────────────────────────────────────────────────
    const cust = parseNote<PackedCustomer>(notes.cust);
    const utm = parseNote<PackedUtm>(notes.utm);

    // ── 6. Server-derived fields ───────────────────────────────────────────
    // Razorpay sends paise; Pabbly + CAPI want rupees. The SDK has returned
    // amount as both number and string across versions - handle both.
    const rawAmount = typeof payment.amount === 'string'
      ? parseInt(payment.amount, 10)
      : payment.amount;
    const paidAmountPaise = Number.isFinite(rawAmount) ? rawAmount : CHECKOUT_CONFIG.amountPaise;
    const paidAmountRupeesString = (paidAmountPaise / 100).toString();
    const paidAmountRupeesNumeric = paidAmountPaise / 100;
    const paidCurrency = payment.currency || CHECKOUT_CONFIG.currency;

    // payment.created_at is Unix seconds.
    const now = payment.created_at
      ? new Date(payment.created_at * 1000)
      : new Date();

    const fullPhone = `${cust.dl ?? ''}${cust.ph ?? ''}`;

    // ── 7. Pabbly payload ──────────────────────────────────────────────────
    // Field names are IDENTICAL to what verify-payment sent - Pabbly's
    // downstream mapping is column-name-based and would break on a rename.
    const pabblyPayload = {
      first_name:        cust.fn ?? '',
      last_name:         cust.ln ?? '',
      full_name:         `${cust.fn ?? ''} ${cust.ln ?? ''}`.trim(),
      email:             cust.em ?? '',
      phone:             fullPhone,
      city:              cust.ct ?? '',
      country_code:      cust.co ?? '',
      payment_id:        paymentId,
      order_id:          payment.order_id ?? '',
      amount:            paidAmountRupeesString,
      currency:          paidCurrency,
      coupon_code:       notes.coupon_code ?? '',
      free_order:        false,
      payment_date:      now.toLocaleDateString('en-IN', { timeZone: CHECKOUT_CONFIG.paymentTimezone }),
      payment_time:      now.toLocaleTimeString('en-IN', { timeZone: CHECKOUT_CONFIG.paymentTimezone }),
      payment_timestamp: now.toISOString(),
      utm_source:        utm.s ?? '',
      utm_medium:        utm.m ?? '',
      utm_campaign:      utm.c ?? '',
      utm_content:       utm.n ?? '',
      utm_term:          utm.t ?? '',
      utm_id:            utm.i ?? '',
    };

    console.log(`[webhook] paymentId=${paymentId} payload:`, pabblyPayload);

    // ── 8. Fire Pabbly ─────────────────────────────────────────────────────
    let pabblyStatus: 'sent' | 'skipped' | 'error' = 'skipped';
    const webhookUrl = process.env.PABBLY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pabblyPayload),
        });
        pabblyStatus = res.ok ? 'sent' : 'error';
        console.log(`[webhook] paymentId=${paymentId} Pabbly ${pabblyStatus} (${res.status})`);
      } catch (err) {
        pabblyStatus = 'error';
        console.error(`[webhook] paymentId=${paymentId} Pabbly error:`, err);
      }
    } else {
      console.error(`[webhook] paymentId=${paymentId} CRITICAL: PABBLY_WEBHOOK_URL not set`);
    }

    // ── 9. Fire Meta CAPI ('sales' custom event) ───────────────────────────
    let capiStatus: 'sent' | 'skipped' | 'error' = 'skipped';
    const metaPixelId = process.env.META_PIXEL_ID;
    const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;

    if (metaPixelId && metaAccessToken && cust.em) {
      try {
        await sendMetaCapiEvent({
          pixelId: metaPixelId,
          accessToken: metaAccessToken,
          paymentId,
          email: cust.em,
          phone: fullPhone,
          firstName: cust.fn ?? '',
          lastName: cust.ln ?? '',
          city: cust.ct ?? '',
          countryCode: cust.co ?? '',
          // Canonical URL packed at order-create time. Meta strips the path
          // under Core Setup anyway; this just avoids leaking query params.
          eventSourceUrl: notes.esu || 'https://prenatal.bodyworx.in',
          fbc: notes.fbc || undefined,
          fbp: notes.fbp || undefined,
          clientIp: notes.ip || undefined,
          clientUserAgent: notes.ua || undefined,
          valueRupees: paidAmountRupeesNumeric,
          currency: paidCurrency,
        });
        capiStatus = 'sent';
        console.log(`[webhook] paymentId=${paymentId} Meta CAPI sent (${CHECKOUT_CONFIG.capi.eventName})`);
      } catch (err) {
        capiStatus = 'error';
        console.error(`[webhook] paymentId=${paymentId} Meta CAPI error:`, err);
      }
    } else {
      console.warn(`[webhook] paymentId=${paymentId} Meta CAPI skipped - env or email missing`);
    }

    // ── 10. Confirmation ───────────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      paymentId,
      kind: FUNNEL_KIND,
      pabbly: pabblyStatus,
      capi: capiStatus,
    });
  } catch (error) {
    console.error('[webhook]', error);
    return NextResponse.json(
      { ok: false, error: 'internal_server_error' },
      { status: 500 }
    );
  }
}
