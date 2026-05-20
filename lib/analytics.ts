/**
 * Client-side analytics helpers.
 * GA4 / Meta Pixel client-side init lives in app/layout.tsx (script tags).
 * Server-side Meta CAPI lives in app/api/razorpay/verify-payment/route.ts.
 *
 * Functions here are no-ops until the underlying tracking IDs are wired in layout.tsx.
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

function pushDataLayer(event: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}

export function trackBeginCheckout(value: number, currency = 'INR') {
  // GA4 only. Meta only receives the custom server-side 'sales' event after a
  // verified Razorpay payment - that's the authoritative conversion signal we
  // optimise ads on (CPR). Client-side standard events are intentionally not
  // fired here so they don't compete with 'sales' in Meta's attribution.
  pushDataLayer('begin_checkout', { value, currency });
}

export function trackCtaClick(ctaLabel: string, location: string) {
  pushDataLayer('cta_click', { cta_label: ctaLabel, location });
}

export function trackPurchaseComplete(params: {
  paymentId: string;
  value: number;
  currency?: string;
}) {
  // GA4 dataLayer push.
  pushDataLayer('purchase_complete', {
    transaction_id: params.paymentId,
    value: params.value,
    currency: params.currency ?? 'INR',
  });
}

/**
 * Fire the Meta Pixel standard 'Purchase' event from the browser, paired with
 * the server-side CAPI Purchase event of the same event_id for deduplication.
 *
 * Why we fire from BOTH sides:
 * - Server CAPI is the authoritative source (not blocked by ad blockers / iOS
 *   tracking prevention) — guarantees we count every paid conversion.
 * - Browser pixel pairs with CAPI so Meta can dedupe by event_id. Without a
 *   browser pair, Meta's dedup coverage drops to 0% and (worse) Meta's
 *   Automatic Event Detection synthesises uncontrolled Purchase events from
 *   page metadata that have NO event_id — those can't be deduped and inflate
 *   the reported count (e.g. 16 real sales → 49 reported Purchases).
 *
 * Per Meta dedup spec (https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events):
 *   "Browser eventID must equal server event_id, and event_name must match
 *   exactly. Both events must arrive within a 48-hour window."
 *
 * Call this AFTER setMetaAdvancedMatching so the Purchase event inherits the
 * hashed user identity (em/ph/fn/ln/ct/country) for high Event Match Quality.
 */
export function trackPurchasePixel(params: {
  paymentId: string;        // used as eventID — must match server event_id
  value: number;            // rupees (or paise/100), same value as CAPI
  currency?: string;        // ISO 4217, e.g. 'INR'
  contentName?: string;     // display name in Events Manager
}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq(
    'track',
    'Purchase',
    {
      value: params.value,
      currency: params.currency ?? 'INR',
      content_name: params.contentName ?? 'Prenatal Challenge',
    },
    { eventID: params.paymentId },
  );
}

// Mirror of the literal in app/layout.tsx so this helper can re-init the pixel
// with Advanced Matching. Pixel IDs aren't secrets - they're already exposed in
// the client bundle - so duplicating as a literal is fine.
const META_PIXEL_ID = '1364192652209120';

/**
 * Re-initialise the Meta Pixel with Manual Advanced Matching (MAM) once we
 * know the buyer's identity. Pass raw form values - Meta's pixel library
 * SHA-256 hashes them client-side before transmitting, so PII never leaves
 * the browser unhashed.
 *
 * Call this on the /checkout success path RIGHT BEFORE the redirect to
 * /thank-you, so the auto-PageView that fires on /thank-you (via Meta's SPA
 * hook into pushState) carries the matching signals. Browser PageView events
 * with MAM raise retargeting audience precision and improve cross-device
 * attribution on top of what server-side CAPI already provides.
 *
 * Per Meta spec normalisation (applied here so the caller passes raw form
 * values): em/fn/ln are lowercased + trimmed; ph is digits-only with country
 * code (no +); ct is lowercase a-z only (no spaces or punctuation); country
 * is lowercase 2-letter ISO. Meta hashes the result with SHA-256.
 */
export function setMetaAdvancedMatching(data: {
  email?: string;
  phone?: string;       // raw with or without country code/dial code
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;     // 2-letter ISO; case-insensitive
}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const matching: Record<string, string> = {};
  if (data.email) matching.em = data.email.trim().toLowerCase();
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '');
    if (digits) matching.ph = digits;
  }
  if (data.firstName) matching.fn = data.firstName.trim().toLowerCase();
  if (data.lastName) matching.ln = data.lastName.trim().toLowerCase();
  if (data.city) {
    const ct = data.city.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (ct) matching.ct = ct;
  }
  if (data.country) {
    const country = data.country.trim().toLowerCase();
    if (country) matching.country = country;
  }
  if (Object.keys(matching).length === 0) return;
  // Calling fbq('init', ID, advancedMatchingObject) a second time updates the
  // matching object on the existing pixel instance. All subsequent events on
  // this and following pages (including Meta's auto-PageView on SPA route
  // changes) inherit these signals.
  window.fbq('init', META_PIXEL_ID, matching);
}
