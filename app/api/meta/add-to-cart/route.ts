import { NextRequest, NextResponse } from 'next/server';
import { sendAtcEvent } from '@/lib/meta-events';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const PRODUCTION_ORIGIN = 'https://prenatal.bodyworx.in';

/**
 * POST /api/meta/add-to-cart
 *
 * Fires the custom 'atc_event' to Meta CAPI when a visitor clicks a landing
 * CTA. Triggered by navigator.sendBeacon from lib/meta-client.ts - the client
 * only signals that the click happened; all hashing + the Graph call are here.
 *
 * Anonymous by nature: no PII exists at CTA click time. Only _fbc/_fbp cookies
 * (attached automatically, same-origin) plus IP and user-agent from headers.
 *
 * Always returns 200 - a tracking failure must never surface to the visitor.
 */
export async function POST(req: NextRequest) {
  try {
    const metaPixelId = process.env.META_PIXEL_ID;
    const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;

    if (!metaPixelId || !metaAccessToken) {
      console.warn('[atc] skipped - META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set');
      return NextResponse.json({ ok: true, capi: 'skipped', reason: 'env_missing' });
    }

    const body = await req.json().catch(() => ({}));

    // Origin only. Meta requires event_source_url for action_source=website,
    // but under the H&W "core setup" restriction Meta strips everything after
    // the domain anyway - sending origin avoids leaking UTMs before that.
    let eventSourceUrl = PRODUCTION_ORIGIN;
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

    await sendAtcEvent({
      pixelId: metaPixelId,
      accessToken: metaAccessToken,
      eventSourceUrl,
      fbc,
      fbp,
      clientIp,
      clientUserAgent,
      valueRupees: CHECKOUT_CONFIG.amountRupeesNumeric,
      currency: CHECKOUT_CONFIG.currency,
    });

    console.log(`[atc] sent - fbp=${fbp ?? 'none'} url=${eventSourceUrl}`);
    return NextResponse.json({ ok: true, capi: 'sent' });
  } catch (err) {
    console.error('[atc] error:', err);
    return NextResponse.json({ ok: true, capi: 'error' });
  }
}
