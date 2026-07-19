/**
 * Client-side triggers for the two upper-funnel Meta CAPI events.
 *
 * The browser's only job is to say "this happened". All hashing and the actual
 * Graph API call happen server-side in app/api/meta/*. No fbq('track', ...)
 * anywhere - PageView remains the only browser-side Meta event on this site.
 *
 * Dedup is two-layer (see docs/META_ATC_IC_SOP.md §4):
 *   1. localStorage flag here - one event per browser lifetime.
 *   2. Deterministic event_id server-side - Meta collapses duplicates within
 *      48h even if this flag is bypassed (multi-tab, cleared storage).
 *
 * Neither call blocks the user: a failed beacon still lets the link navigate,
 * a failed IC still lets the payment open.
 */

// Meta's flags. Deliberately a DIFFERENT namespace from lib/ga4.ts's
// bw_ga4_*_fired keys so one platform failing never suppresses the other.
const ATC_FLAG = 'bw_atc_fired';
const IC_FLAG = 'bw_ic_fired';

function readFlag(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode - fall through and fire, best-effort dedup
  }
}

function writeFlag(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore - see readFlag
  }
}

/** SHA-256 hex via Web Crypto. Only used to key the IC dedup flag locally. */
async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return value;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fire atc_event once per browser, on the first landing CTA click.
 *
 * Uses sendBeacon because the click navigates to /checkout immediately - a
 * normal fetch would be cancelled mid-flight by the unload. The flag is
 * stamped BEFORE the beacon leaves, so a tab killed mid-navigation still
 * leaves the browser marked as fired (we'd rather drop one event than send a
 * duplicate on every subsequent click).
 *
 * Cookies (_fbc/_fbp) attach automatically - the beacon URL is same-origin.
 * IP + user-agent are read server-side from the request headers.
 */
export function fireAtcOnce(): void {
  if (typeof window === 'undefined') return;
  if (readFlag(ATC_FLAG)) return;

  writeFlag(ATC_FLAG, '1');

  const body = JSON.stringify({ eventSourceUrl: window.location.href });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        '/api/meta/add-to-cart',
        new Blob([body], { type: 'application/json' })
      );
      return;
    }
  } catch {
    // fall through to the fetch fallback
  }

  // keepalive lets the request outlive the page unload, same as a beacon.
  void fetch('/api/meta/add-to-cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Fire ic_event once per browser per email address, from the checkout submit
 * handler after validation passes and before create-order.
 *
 * Keyed on the email hash rather than a bare flag: if someone retries with a
 * different address that's a genuinely different intent and should fire again.
 *
 * The flag is stamped only on a SUCCESSFUL response - unlike ATC there's no
 * navigation race here, so a failed call should be retryable on the next
 * submit rather than permanently suppressed.
 */
export async function fireIcOnce(customer: {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  phone: string;
  countryCode: string;
  dialCode: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const emailHash = await sha256Hex(customer.email.trim().toLowerCase());
    if (readFlag(IC_FLAG) === emailHash) return;

    const res = await fetch('/api/meta/initiate-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        eventSourceUrl: window.location.href,
      }),
    });

    if (res.ok) writeFlag(IC_FLAG, emailHash);
  } catch {
    // Never block the payment on a tracking failure.
  }
}
