import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { validateCoupon } from '@/lib/coupons';

// ── OPTIONAL BLOCK: META CONVERSIONS API ─────────────────────────────────────
// Per BACKEND_SOP.md: this block executes only when META_PIXEL_ID and
// META_CAPI_ACCESS_TOKEN are both present. If CAPI is permanently not required
// for this client, delete this function and the block in the POST handler.

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function sendMetaCapiEvent(params: {
  pixelId: string;
  accessToken: string;
  paymentId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  countryCode: string;
  eventSourceUrl: string;
  fbc: string | undefined;
  fbp: string | undefined;
  clientIp: string | undefined;
  clientUserAgent: string | undefined;
  valueRupees: number;
  currency: string;
}) {
  // Email: lowercase + trim, then SHA-256.
  const normalisedEmail = params.email.trim().toLowerCase();
  const hashedEmail = sha256(normalisedEmail);

  // Phone: digits only (E.164 without +) before hashing.
  const rawPhone = params.phone.replace(/\D/g, '');
  const hashedPhone = rawPhone ? sha256(rawPhone) : undefined;

  // external_id: a stable-per-customer-per-transaction identifier Meta uses
  // as an additional matching signal (+~11% EMQ per Meta's recommendations
  // panel). Composed of normalised email + payment id so it's both
  // user-stable across this transaction AND unique enough to act as a
  // dedup/attribution cross-reference. SHA-256 so no PII in the value.
  const externalId = sha256(`${normalisedEmail}|${params.paymentId}`);

  // Per Meta spec: fn/ln are lowercase + trim. ct is lowercase a-z only (no
  // whitespace/punctuation). country is lowercase 2-letter ISO. Adding these
  // raises Event Match Quality (EMQ) which directly improves attribution and
  // therefore CPR — Meta uses them to match the conversion back to ad clicks.
  const fn = params.firstName.trim().toLowerCase();
  const ln = params.lastName.trim().toLowerCase();
  const ct = params.city.trim().toLowerCase().replace(/[^a-z]/g, '');
  const country = params.countryCode.trim().toLowerCase();

  const hashedFn = fn ? sha256(fn) : undefined;
  const hashedLn = ln ? sha256(ln) : undefined;
  const hashedCt = ct ? sha256(ct) : undefined;
  const hashedCountry = country ? sha256(country) : undefined;

  // Shared fields across BOTH events. Standard 'Purchase' gives us AEM auto-
  // priority for iOS attribution and Meta's mature global algorithm. Custom
  // event (e.g. 'sales') is our internal source-of-truth label that excludes
  // any URL-inferred or third-party 'Purchase' events. Same event_id on both
  // means they natural-dedup against pixel events but not against each other
  // (different event_name). Campaign Results column reads one event only.
  const baseEvent = {
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.paymentId,
    action_source: 'website',
    // Required for action_source=website since Feb 2021; strictly enforced in
    // restricted ad categories (health/prenatal/financial). Without it Meta
    // discards the event from reporting & optimisation.
    event_source_url: params.eventSourceUrl,
    user_data: {
      em: [hashedEmail],
      ...(hashedPhone && { ph: [hashedPhone] }),
      ...(hashedFn && { fn: [hashedFn] }),
      ...(hashedLn && { ln: [hashedLn] }),
      ...(hashedCt && { ct: [hashedCt] }),
      ...(hashedCountry && { country: [hashedCountry] }),
      external_id: [externalId],
      ...(params.fbc && { fbc: params.fbc }),
      ...(params.fbp && { fbp: params.fbp }),
      ...(params.clientUserAgent && { client_user_agent: params.clientUserAgent }),
      ...(params.clientIp && { client_ip_address: params.clientIp }),
    },
    custom_data: {
      currency: params.currency,
      value: params.valueRupees,
      payment_id: params.paymentId,
    },
  };

  const events = [
    { ...baseEvent, event_name: 'Purchase' },
    { ...baseEvent, event_name: CHECKOUT_CONFIG.capi.eventName },
  ];

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${params.pixelId}/events?access_token=${params.accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: events }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }

  return res.json();
}
// ── END OPTIONAL BLOCK ────────────────────────────────────────────────────────

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  phone: string;
  countryCode: string;
  dialCode: string;
}

interface UtmData {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  id?: string;
}

/**
 * Fetch the authoritative payment record from Razorpay. We trust this over the
 * client because the amount might have been discounted by a coupon - Pabbly +
 * CAPI must reflect what was actually paid, not the list price.
 */
async function fetchActualPaidAmount(paymentId: string): Promise<{
  amountPaise: number;
  currency: string;
}> {
  const fallback = {
    amountPaise: CHECKOUT_CONFIG.amountPaise,
    currency: CHECKOUT_CONFIG.currency,
  };
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return fallback;
  }
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const payment = await razorpay.payments.fetch(paymentId);
    const amount = typeof payment.amount === 'string' ? parseInt(payment.amount, 10) : payment.amount;
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      return { amountPaise: amount, currency: String(payment.currency ?? CHECKOUT_CONFIG.currency) };
    }
  } catch (err) {
    console.error('[verify-payment] Could not fetch payment record:', err);
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      paymentId,
      signature,
      customer,
      utm,
      couponCode,
      freeOrderToken,
      eventSourceUrl,
    }: {
      orderId: string;
      paymentId?: string;
      signature?: string;
      customer: CustomerData;
      utm: UtmData;
      couponCode?: string;
      freeOrderToken?: string;
      eventSourceUrl?: string;
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing order ID.' },
        { status: 400 }
      );
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('[verify-payment] Razorpay secret not configured');
      return NextResponse.json(
        { success: false, error: 'Payment verification not configured.' },
        { status: 500 }
      );
    }

    let resolvedPaymentId: string;
    let paidAmountPaise: number;
    let paidCurrency: string;

    // ── Free-order branch ──────────────────────────────────────────────────
    // Triggered when create-order issued a free-order token (100%-off coupon).
    // We re-validate the coupon AND verify the HMAC, so the client can't fake
    // a free order by guessing an orderId pattern.
    const isFreeOrder = orderId.startsWith('free_') && !!freeOrderToken;
    if (isFreeOrder) {
      if (!couponCode) {
        return NextResponse.json(
          { success: false, error: 'Free-order flow requires a coupon code.' },
          { status: 400 }
        );
      }
      const coupon = validateCoupon(couponCode);
      if (!coupon.ok || coupon.finalAmountPaise !== 0) {
        return NextResponse.json(
          { success: false, error: 'Coupon no longer valid for a free order.' },
          { status: 400 }
        );
      }
      const expectedToken = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${coupon.code}|free`)
        .digest('hex');
      if (!freeOrderToken || expectedToken !== freeOrderToken) {
        return NextResponse.json(
          { success: false, error: 'Free-order token mismatch.' },
          { status: 400 }
        );
      }
      // Authoritative free-order info
      resolvedPaymentId = `free_pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      paidAmountPaise = 0;
      paidCurrency = CHECKOUT_CONFIG.currency;
    } else {
      // ── Standard paid-order branch ───────────────────────────────────────
      if (!paymentId || !signature) {
        return NextResponse.json(
          { success: false, error: 'Missing required payment fields.' },
          { status: 400 }
        );
      }

      // HMAC-SHA256 of "orderId|paymentId" - Razorpay protocol requirement
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json(
          { success: false, error: 'Payment verification failed.' },
          { status: 400 }
        );
      }

      // Pull the authoritative amount from Razorpay so coupon-discounted orders
      // report the actual paid amount in Pabbly + CAPI.
      const fetched = await fetchActualPaidAmount(paymentId);
      resolvedPaymentId = paymentId;
      paidAmountPaise = fetched.amountPaise;
      paidCurrency = fetched.currency;
    }

    const paidAmountRupeesString = (paidAmountPaise / 100).toString();
    const paidAmountRupeesNumeric = paidAmountPaise / 100;

    // Payment verified - build Pabbly payload
    const now = new Date();
    const pabblyPayload = {
      first_name:        customer.firstName,
      last_name:         customer.lastName,
      full_name:         `${customer.firstName} ${customer.lastName}`,
      email:             customer.email,
      phone:             `${customer.dialCode}${customer.phone}`,
      city:              customer.city,
      country_code:      customer.countryCode,
      payment_id:        resolvedPaymentId,
      order_id:          orderId,
      amount:            paidAmountRupeesString,
      currency:          paidCurrency,
      coupon_code:       couponCode ?? '',
      free_order:        isFreeOrder,
      payment_date:      now.toLocaleDateString('en-IN', { timeZone: CHECKOUT_CONFIG.paymentTimezone }),
      payment_time:      now.toLocaleTimeString('en-IN', { timeZone: CHECKOUT_CONFIG.paymentTimezone }),
      payment_timestamp: now.toISOString(),
      utm_source:        utm?.source   ?? '',
      utm_medium:        utm?.medium   ?? '',
      utm_campaign:      utm?.campaign ?? '',
      utm_content:       utm?.content  ?? '',
      utm_term:          utm?.term     ?? '',
      utm_id:            utm?.id       ?? '',
    };

    console.log('[verify-payment] Verified purchase:', pabblyPayload);

    // Fire Pabbly webhook (non-blocking - errors never surface to the user)
    const webhookUrl = process.env.PABBLY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pabblyPayload),
        });
        if (webhookResponse.ok) {
          console.log('[verify-payment] Pabbly webhook successful:', webhookResponse.status);
        } else {
          console.error('[verify-payment] Pabbly webhook failed:', webhookResponse.status, webhookResponse.statusText);
        }
      } catch (err) {
        console.error('[verify-payment] Pabbly webhook error:', err);
      }
    } else {
      console.error('[verify-payment] CRITICAL: PABBLY_WEBHOOK_URL not set - webhook skipped');
    }

    // ── OPTIONAL BLOCK: META CONVERSIONS API ─────────────────────────────────
    // Fires the custom 'sales' event (name set in CHECKOUT_CONFIG.capi.eventName).
    // Skipped for free QA-coupon orders so test registrations don't show up as
    // conversions in Meta Ads Manager.
    const metaPixelId = process.env.META_PIXEL_ID;
    const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
    if (metaPixelId && metaAccessToken && !isFreeOrder) {
      const fbc = req.cookies.get('_fbc')?.value;
      const fbp = req.cookies.get('_fbp')?.value;
      const clientIp =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        undefined;
      const clientUserAgent = req.headers.get('user-agent') ?? undefined;
      const fullPhone = `${customer.dialCode}${customer.phone}`;
      // Fall back to the production checkout URL if the client didn't send one
      // (older clients, or any caller that bypasses CheckoutForm). Meta requires
      // event_source_url for action_source=website, so we must always send it.
      const resolvedEventSourceUrl = eventSourceUrl || 'https://prenatal.bodyworx.in/checkout';
      try {
        const capiResult = await sendMetaCapiEvent({
          pixelId: metaPixelId,
          accessToken: metaAccessToken,
          paymentId: resolvedPaymentId,
          email: customer.email,
          phone: fullPhone,
          firstName: customer.firstName,
          lastName: customer.lastName,
          city: customer.city,
          countryCode: customer.countryCode,
          eventSourceUrl: resolvedEventSourceUrl,
          fbc,
          fbp,
          clientIp,
          clientUserAgent,
          valueRupees: paidAmountRupeesNumeric,
          currency: paidCurrency,
        });
        console.log('[verify-payment] Meta CAPI event sent:', capiResult);
      } catch (err) {
        console.error('[verify-payment] Meta CAPI error:', err);
      }
    } else {
      console.error('[verify-payment] Meta CAPI skipped - META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set');
    }
    // ── END OPTIONAL BLOCK ────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      paymentId: resolvedPaymentId,
      amount: paidAmountRupeesNumeric,
      currency: paidCurrency,
      freeOrder: isFreeOrder,
    });
  } catch (error) {
    console.error('[verify-payment]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
