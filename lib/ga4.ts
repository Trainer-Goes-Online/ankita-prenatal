/**
 * GA4 event helper - once-per-browser, fired via real gtag() calls.
 *
 * WHY THIS EXISTS: lib/analytics.ts used to push GTM-shaped objects
 * (`dataLayer.push({event: 'x'})`) which reach NOTHING on this site. We load
 * gtag.js directly (app/layout.tsx) with no GTM container, and gtag.js only
 * interprets the `arguments`-shaped entries produced by gtag() itself - plain
 * objects are ignored silently. Every custom GA4 event must go through here.
 *
 * These are REACH counts, not click counts: each event fires at most once per
 * browser, ever. They answer "how many people did X", not "how many times".
 * Cross-device / incognito / cleared-storage visitors re-count - unavoidable
 * without a database, so don't expect these to reconcile with Meta's numbers.
 *
 * No value/currency is ever attached. GA4 counts stay deliberately independent
 * of Meta's monetary reporting.
 */

export type Ga4Event = 'add_to_cart' | 'initiate_checkout' | 'join_whatsapp';

// Separate namespace from the Meta flags (bw_atc_fired / bw_ic_fired) so a
// Meta outage can never suppress a GA4 event, or vice versa.
const flagKey = (event: Ga4Event) => `bw_ga4_${event}_fired`;

/**
 * Fire a GA4 event at most once per browser.
 *
 * Ordering matters: we stamp the localStorage flag BEFORE calling gtag,
 * because a CTA click typically navigates away microseconds later and an
 * un-stamped flag double-fires on rapid clicks.
 *
 * If gtag is absent (script blocked, or not yet loaded) we return WITHOUT
 * stamping - otherwise the event would be permanently suppressed for that
 * browser and could never fire on a later, properly-configured session.
 */
export function trackGa4EventOnce(event: Ga4Event): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return; // no stamp - see above

  const key = flagKey(event);

  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
  } catch {
    // Private mode / sandboxed iframe: localStorage throws. Fire anyway and
    // accept best-effort dedup - an extra count beats a lost one.
  }

  try {
    window.gtag('event', event);
  } catch {
    // Analytics must never throw into a click handler.
  }
}
