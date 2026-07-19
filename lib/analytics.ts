/**
 * Client-side analytics helpers.
 * GA4 / Meta Pixel client-side init lives in app/layout.tsx (script tags).
 * Server-side Meta CAPI lives in app/api/razorpay/webhook/route.ts ('sales')
 * and app/api/meta/* ('atc_event' / 'ic_event').
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

/**
 * Send a GA4 event via gtag().
 *
 * This used to be a `dataLayer.push({event, ...})` helper, which reached
 * NOTHING: that's the GTM convention, and this site loads gtag.js directly
 * (app/layout.tsx) with no GTM container. gtag.js pushes an `arguments` object
 * and ignores plain objects, so every event fired through the old helper was
 * silently discarded. Do not reintroduce dataLayer.push here.
 *
 * For the once-per-browser funnel events (add_to_cart / initiate_checkout /
 * join_whatsapp) use lib/ga4.ts instead - those are deduped reach counts.
 * This helper is for repeatable, per-occurrence events.
 */
function sendGa4Event(event: string, params: EventParams = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', event, params);
  } catch {
    // Analytics must never throw into a handler.
  }
}

export function trackBeginCheckout(value: number, currency = 'INR') {
  // GA4 only. Meta receives the custom server-side 'sales' event after Razorpay
  // captures the payment - that's the authoritative conversion signal we
  // optimise ads on (CPR). Client-side standard events are intentionally not
  // fired here so they don't compete with 'sales' in Meta's attribution.
  sendGa4Event('begin_checkout', { value, currency });
}

export function trackCtaClick(ctaLabel: string, location: string) {
  sendGa4Event('cta_click', { cta_label: ctaLabel, location });
}

export function trackPurchaseComplete(params: {
  paymentId: string;
  value: number;
  currency?: string;
}) {
  sendGa4Event('purchase_complete', {
    transaction_id: params.paymentId,
    value: params.value,
    currency: params.currency ?? 'INR',
  });
}

// NOTE: There is intentionally NO browser-side 'Purchase' helper.
//
// Under Meta's Health & Wellness data-source restriction, the standard
// 'Purchase' event is restricted by name for this (health-categorized) pixel,
// so firing it adds no optimisation value and leaks a health-y content_name.
// The conversion fires server-side ONLY, as the custom 'sales' event via CAPI
// (see app/api/razorpay/webhook/route.ts). Campaigns optimise directly
// on that custom event. If a future media-buyer dedup escalation ever requires
// a browser pair, it must be a CUSTOM event (matching CHECKOUT_CONFIG.capi
// .eventName) with a neutral payload - never the standard 'Purchase'. See
// docs/META_TRACKING_AGENT_GUIDE.md.

// Mirror of the literal in app/layout.tsx so this helper can re-init the pixel
// with Advanced Matching. Pixel IDs aren't secrets - they're already exposed in
// the client bundle - so duplicating as a literal is fine.
const META_PIXEL_ID = '1364192652209120';

// First-party cookie that persists hashed MAM values across pages and sessions
// so every PageView (not just the one after form-fill) inherits user identity.
// 30-day TTL matches our UTM attribution window. Same-origin-only, SameSite=Lax.
// Cookie is also read by the inline pixel script in app/layout.tsx BEFORE the
// first PageView fires, so even hard-refresh page loads get identified.
const MAM_COOKIE_NAME = 'bw_mam';
const MAM_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * SHA-256 hex hasher using the Web Crypto API. Available in all modern browsers
 * over HTTPS (and on http://localhost). We pre-hash so the cookie never stores
 * plain PII - Meta's pixel detects 64-char hex strings as already-hashed and
 * uses them verbatim, no double-hashing.
 */
async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return value;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Apply Meta-spec normalisation, hash each field with SHA-256, and return the
 * matching object ready to hand to fbq init / store in the cookie.
 */
async function buildHashedMatching(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}): Promise<Record<string, string>> {
  const normalised: Record<string, string | undefined> = {};
  if (data.email) normalised.em = data.email.trim().toLowerCase();
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '');
    if (digits) normalised.ph = digits;
  }
  if (data.firstName) normalised.fn = data.firstName.trim().toLowerCase();
  if (data.lastName) normalised.ln = data.lastName.trim().toLowerCase();
  if (data.city) {
    const ct = data.city.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (ct) normalised.ct = ct;
  }
  if (data.country) {
    const country = data.country.trim().toLowerCase();
    if (country) normalised.country = country;
  }
  const keys = Object.keys(normalised) as Array<keyof typeof normalised>;
  const hashes = await Promise.all(keys.map((k) => sha256Hex(normalised[k] as string)));
  const matching: Record<string, string> = {};
  keys.forEach((k, i) => { matching[k as string] = hashes[i]; });

  // external_id: stable per-user identifier per Meta's spec
  // (developers.facebook.com → External ID). Must be CONSISTENT across
  // browser Pixel and CAPI for the same user. We derive it as sha256 of the
  // normalised email - identical value across every channel and session for
  // a given user. Meta caches the external_id → Facebook user association
  // after the first match, so future events carrying just external_id (e.g.
  // anonymous return-visit PageViews) get re-matched without other PII.
  // Sending external_id is recommended even when em is also present - they
  // are matched via different internal indices and reinforce each other.
  if (matching.em) {
    matching.external_id = matching.em;
  }
  return matching;
}

function writeMamCookie(matching: Record<string, string>) {
  if (typeof document === 'undefined') return;
  if (Object.keys(matching).length === 0) return;
  const value = encodeURIComponent(JSON.stringify(matching));
  document.cookie = `${MAM_COOKIE_NAME}=${value}; Path=/; Max-Age=${MAM_COOKIE_TTL_SECONDS}; SameSite=Lax`;
}

export function readMamCookie(): Record<string, string> | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${MAM_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Re-initialise the Meta Pixel with Manual Advanced Matching (MAM). Pass raw
 * form values - this helper SHA-256 hashes them client-side via Web Crypto
 * (Meta's pixel sees pre-hashed values and uses them verbatim), then ALSO
 * persists the hashed values to a first-party cookie so every subsequent
 * PageView on any page inherits the matching object.
 *
 * Called in three places:
 *   1. On form completion (CheckoutForm useEffect) - earliest possible moment
 *      we know identity, so /checkout PageViews from that point get identified.
 *   2. On payment success (CheckoutForm handlePaymentSuccess) - belt-and-
 *      braces with latest field values, in case the user edited fields after
 *      step 1.
 *   3. On /thank-you mount (backup) - re-applies from the persisted cookie if
 *      anything in step 1/2 failed.
 *
 * Per Meta spec: em/fn/ln are lowercased + trimmed; ph is digits-only (no +);
 * ct is lowercase a-z only (no spaces/punctuation); country is lowercase
 * 2-letter ISO. Output values are SHA-256 hex strings.
 */
export async function setMetaAdvancedMatching(data: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const matching = await buildHashedMatching(data);
  if (Object.keys(matching).length === 0) return;
  // Calling fbq('init', ID, advancedMatchingObject) a second time updates the
  // matching object on the existing pixel instance. All subsequent events on
  // this and following pages (including Meta's auto-PageView on SPA route
  // changes) inherit these signals.
  window.fbq('init', META_PIXEL_ID, matching);
  writeMamCookie(matching);
}

/**
 * Re-fire MAM from the persisted cookie. Used on /thank-you mount as a safety
 * net AND on any cold page load that the inline script in layout.tsx doesn't
 * cover (e.g. very fast SPA navigations where the layout script raced the
 * first PageView).
 */
export function reapplyMamFromCookie() {
  if (typeof window === 'undefined' || !window.fbq) return;
  const matching = readMamCookie();
  if (!matching || Object.keys(matching).length === 0) return;
  window.fbq('init', META_PIXEL_ID, matching);
}
