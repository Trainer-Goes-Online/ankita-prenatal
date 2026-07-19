/**
 * Shared Meta Conversions API helpers.
 *
 * Extracted verbatim from app/api/razorpay/verify-payment/route.ts when the
 * conversion pipeline moved to the Razorpay webhook. The payload shape, event
 * name, hashing, and external_id derivation are UNCHANGED - Meta's dedup and
 * match quality depend on them staying identical.
 *
 * Consumers:
 *   - app/api/razorpay/webhook/route.ts  → the 'sales' conversion event
 *   - lib/meta-events.ts                 → reuses sha256() for atc/ic events
 */

import crypto from 'crypto';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  phone: string;
  countryCode: string;
  dialCode: string;
}

export async function sendMetaCapiEvent(params: {
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

  // external_id: stable per-USER identifier (not per-transaction) per Meta's
  // spec (developers.facebook.com → External ID). Must be CONSISTENT across
  // browser Pixel and CAPI for the same user - browser MAM init in
  // lib/analytics.ts buildHashedMatching computes the same value. Meta caches
  // the external_id → Facebook user mapping after the first match, so future
  // events from the same user (including anonymous return-visit PageViews)
  // can be re-matched without other PII. Using sha256(normalised email)
  // means the same user always produces the same external_id regardless of
  // session, channel, or how many transactions they make.
  const externalId = sha256(normalisedEmail);

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

  // RESTRICTED-CATEGORY POSTURE (Health & Wellness data-source restriction):
  // We fire ONLY the custom event (CHECKOUT_CONFIG.capi.eventName, e.g. 'sales').
  // The standard 'Purchase' event is restricted by name for health-categorized
  // datasets, so it carries no optimisation value and is the exact
  // "purchase-on-a-health-domain" signal Meta clamps. We optimise campaigns
  // directly on the custom event instead. Keep the payload PHI-free (neutral
  // event name + value/currency/payment_id only) so Meta won't filter it as
  // sensitive. See docs/META_TRACKING_AGENT_GUIDE.md.
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

  const events = [{ ...baseEvent, event_name: CHECKOUT_CONFIG.capi.eventName }];

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
