import { NextRequest, NextResponse } from 'next/server';
import { sendIcEvent } from '@/lib/meta-events';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import type { CustomerData } from '@/lib/meta-capi';

const PRODUCTION_ORIGIN = 'https://prenatal.bodyworx.in';

/**
 * POST /api/meta/initiate-checkout
 *
 * Fires the custom 'ic_event' to Meta CAPI when a visitor submits a fully
 * valid checkout form, immediately before create-order. Carries the same 11
 * hashed signals as the 'sales' conversion event (EMQ ~9-10).
 *
 * Called from CheckoutForm's submit handler via lib/meta-client.ts. The free /
 * QA-coupon path never reaches here - those orders short-circuit earlier.
 *
 * Returns 200 on success so the client can stamp its dedup flag; returns 400
 * only for a missing email (the flag stays unstamped so a retry can fire).
 */
export async function POST(req: NextRequest) {
  try {
    // Validate the body BEFORE the env check, so a malformed request always
    // gets its 400 regardless of how tracking happens to be configured.
    const body = await req.json().catch(() => ({}));
    const customer = body.customer as CustomerData | undefined;

    if (!customer?.email?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing customer email.' },
        { status: 400 }
      );
    }

    const metaPixelId = process.env.META_PIXEL_ID;
    const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;

    if (!metaPixelId || !metaAccessToken) {
      console.warn('[ic] skipped - META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set');
      return NextResponse.json({ ok: true, capi: 'skipped', reason: 'env_missing' });
    }

    // Origin only - same H&W posture as the 'sales' event. The checkout path
    // itself is neutral, but the query string carries UTMs we don't send Meta.
    let eventSourceUrl = `${PRODUCTION_ORIGIN}/checkout`;
    if (typeof body.eventSourceUrl === 'string' && body.eventSourceUrl) {
      try {
        eventSourceUrl = new URL(body.eventSourceUrl).origin;
      } catch {
        // malformed URL - keep the production fallback
      }
    }

    const fbc = req.cookies.get('_fbc')?.value;
    const fbp = req.cookies.get('_fbp')?.value;
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      undefined;
    const clientUserAgent = req.headers.get('user-agent') ?? undefined;

    await sendIcEvent({
      pixelId: metaPixelId,
      accessToken: metaAccessToken,
      email: customer.email,
      phone: `${customer.dialCode ?? ''}${customer.phone ?? ''}`,
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      city: customer.city ?? '',
      countryCode: customer.countryCode ?? '',
      eventSourceUrl,
      fbc,
      fbp,
      clientIp,
      clientUserAgent,
      valueRupees: CHECKOUT_CONFIG.amountRupeesNumeric,
      currency: CHECKOUT_CONFIG.currency,
    });

    console.log(`[ic] sent - url=${eventSourceUrl}`);
    return NextResponse.json({ ok: true, capi: 'sent' });
  } catch (err) {
    console.error('[ic] error:', err);
    return NextResponse.json({ ok: true, capi: 'error' });
  }
}
