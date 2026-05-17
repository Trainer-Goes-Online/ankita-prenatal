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
  // GA4 only. The Meta conversion is reported server-side as the custom 'sales'
  // event via CAPI in /api/razorpay/verify-payment - more accurate than the
  // browser pixel (which is blocked by ad blockers / iOS tracking prevention).
  pushDataLayer('purchase_complete', {
    transaction_id: params.paymentId,
    value: params.value,
    currency: params.currency ?? 'INR',
  });
}
