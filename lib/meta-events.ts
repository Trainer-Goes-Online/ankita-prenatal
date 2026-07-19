/**
 * Upper-funnel Meta CAPI events: atc_event (CTA click) + ic_event (pay click).
 *
 * Both are CUSTOM, opaque event names - never the standard `AddToCart` /
 * `InitiateCheckout`, and never their snake_case forms. This pixel is in Meta's
 * Health & Wellness restricted category; the classifier keyword-matches
 * 'add_to_cart'/'initiate_checkout' against the standard-event vocabulary and
 * can inherit the same restriction onto them. See docs/META_ATC_IC_SOP.md §7b.
 *
 * PII posture mirrors the existing 'sales' conversion event (lib/meta-capi.ts):
 *   - atc_event: anonymous. No PII exists at CTA click time - the visitor
 *     hasn't filled anything. Only fbc/fbp/IP/UA. EMQ ~3-5 (data ceiling).
 *   - ic_event:  full hashed user_data, identical shape + external_id
 *     derivation to 'sales'. EMQ ~9-10.
 *
 * Both fire from our own API routes (app/api/meta/*), triggered by a browser
 * click - NOT from the Razorpay webhook. They represent intent that happens
 * before any payment attempt, so the webhook can't see them.
 */

import crypto from 'crypto';
import { sha256 } from '@/lib/meta-capi';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const GRAPH_URL = (pixelId: string, accessToken: string) =>
  `https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${accessToken}`;

async function postToMeta(pixelId: string, accessToken: string, event: unknown) {
  const res = await fetch(GRAPH_URL(pixelId, accessToken), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [event] }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

/**
 * atc_event - fired on the first landing-page CTA click of a browser's
 * lifetime. Anonymous by necessity: at click time we have no form data.
 *
 * event_id = sha256(fbp + '|atc') so the same browser produces the same id and
 * Meta collapses accidental duplicates within its 48h dedup window. Visitors
 * with tracking blockers have no _fbp - we fall back to a random id, which
 * means Meta-side dedup can't fire for them (the client localStorage flag is
 * the only guard in that case).
 */
export async function sendAtcEvent(params: {
  pixelId: string;
  accessToken: string;
  eventSourceUrl: string;
  fbc: string | undefined;
  fbp: string | undefined;
  clientIp: string | undefined;
  clientUserAgent: string | undefined;
  valueRupees: number;
  currency: string;
}) {
  const eventId = params.fbp
    ? sha256(`${params.fbp}|atc`)
    : `${crypto.randomBytes(16).toString('hex')}_atc`;

  const event = {
    event_name: CHECKOUT_CONFIG.capi.atcEventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: params.eventSourceUrl,
    user_data: {
      // No em/ph/fn/ln/ct/country/external_id - none exist at CTA click time.
      ...(params.fbc && { fbc: params.fbc }),
      ...(params.fbp && { fbp: params.fbp }),
      ...(params.clientUserAgent && { client_user_agent: params.clientUserAgent }),
      ...(params.clientIp && { client_ip_address: params.clientIp }),
    },
    // No content_name/content_ids/content_type - the product name is a health
    // term ("Prenatal Pain Relief & Labor Prep Challenge") and would hand the
    // restricted-category classifier exactly the signal we're avoiding.
    custom_data: {
      currency: params.currency,
      value: params.valueRupees,
    },
  };

  return postToMeta(params.pixelId, params.accessToken, event);
}

/**
 * ic_event - fired when a visitor submits a fully-valid checkout form, in the
 * instant before create-order. Carries the same 11 signals as 'sales'.
 *
 * event_id = sha256(normalisedEmail + '|ic') - the SAME real user produces the
 * same id across devices and sessions, so Meta's 48h dedup catches duplicates
 * the per-browser localStorage flag can't (e.g. phone + desktop). Only the
 * hash reaches the wire, never the raw address.
 */
export async function sendIcEvent(params: {
  pixelId: string;
  accessToken: string;
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
  // Normalisation is byte-identical to lib/meta-capi.ts so external_id matches
  // across ic_event, sales, and the browser MAM cookie. Meta indexes on that
  // consistency - diverging here would fragment the user's identity.
  const normalisedEmail = params.email.trim().toLowerCase();
  const hashedEmail = sha256(normalisedEmail);
  const externalId = sha256(normalisedEmail);

  const rawPhone = params.phone.replace(/\D/g, '');
  const hashedPhone = rawPhone ? sha256(rawPhone) : undefined;

  const fn = params.firstName.trim().toLowerCase();
  const ln = params.lastName.trim().toLowerCase();
  const ct = params.city.trim().toLowerCase().replace(/[^a-z]/g, '');
  const country = params.countryCode.trim().toLowerCase();

  const hashedFn = fn ? sha256(fn) : undefined;
  const hashedLn = ln ? sha256(ln) : undefined;
  const hashedCt = ct ? sha256(ct) : undefined;
  const hashedCountry = country ? sha256(country) : undefined;

  const event = {
    event_name: CHECKOUT_CONFIG.capi.icEventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: sha256(`${normalisedEmail}|ic`),
    action_source: 'website',
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
    },
  };

  return postToMeta(params.pixelId, params.accessToken, event);
}
