import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import { validateCoupon } from '@/lib/coupons';
import type { CustomerData } from '@/lib/meta-capi';
import type { UtmData } from '@/lib/utm';

/**
 * POST /api/razorpay/verify-payment - FREE / QA-COUPON ORDERS ONLY.
 *
 * Paid orders no longer come through here. They are tracked server-to-server
 * by /api/razorpay/webhook, which fires whether or not the buyer's browser
 * ever returns from their UPI app. See docs/RAZORPAY_WEBHOOK_MIGRATION.md.
 *
 * This route survives for exactly one reason: 100%-off coupons (tgotest2025)
 * never create a Razorpay order at all - Razorpay rejects ₹0 - so Razorpay has
 * nothing to send a webhook about. The free flow mints a signed `free_*` order
 * in create-order and settles it here.
 *
 * Meta CAPI is deliberately NOT fired for free orders: those are internal QA
 * registrations and must never show up as conversions in Ads Manager. They do
 * reach Pabbly, tagged free_order=true and amount=0 so they're easy to filter.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      customer,
      utm,
      couponCode,
      freeOrderToken,
    }: {
      orderId: string;
      customer: CustomerData;
      utm: UtmData;
      couponCode?: string;
      freeOrderToken?: string;
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

    // Paid orders must go through the webhook. If a stale client (or a probe)
    // posts a real payment here, reject rather than double-firing Pabbly.
    const isFreeOrder = orderId.startsWith('free_') && !!freeOrderToken;
    if (!isFreeOrder) {
      console.warn(`[verify-payment] rejected non-free order ${orderId} - paid orders are webhook-tracked`);
      return NextResponse.json(
        { success: false, error: 'This route only settles free orders.' },
        { status: 400 }
      );
    }

    if (!couponCode) {
      return NextResponse.json(
        { success: false, error: 'Free-order flow requires a coupon code.' },
        { status: 400 }
      );
    }

    // Re-validate the coupon AND verify the HMAC, so the client can't fake a
    // free order by guessing an orderId pattern.
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

    if (expectedToken !== freeOrderToken) {
      return NextResponse.json(
        { success: false, error: 'Free-order token mismatch.' },
        { status: 400 }
      );
    }

    const resolvedPaymentId = `free_pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

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
      amount:            '0',
      currency:          CHECKOUT_CONFIG.currency,
      coupon_code:       couponCode,
      free_order:        true,
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

    console.log('[verify-payment] Verified FREE registration:', pabblyPayload);

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

    return NextResponse.json({
      success: true,
      paymentId: resolvedPaymentId,
      amount: 0,
      currency: CHECKOUT_CONFIG.currency,
      freeOrder: true,
    });
  } catch (error) {
    console.error('[verify-payment]', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
