# Meta Tracking — Drop-in Agent Guide

Single canonical guide for implementing the full Meta tracking stack in any sibling funnel (paid info-product, lead-gen, course launch, fitness, fertility, health, etc.). Hand this file to a fresh Claude Code session in any new project — it's self-contained.

The pattern shipped here delivers:
- **CAPI EMQ: 9.5+/10** on every paid conversion
- **Browser PageView EMQ: 6.0 for cold, 8.0+ for return / post-form-fill visitors**
- **Zero diagnostic warnings** from Meta (event_source_url, MAM, domain allow list, dedup)
- **Restricted-category compliant** (health/prenatal/financial/political)
- **Single deterministic conversion signal** for campaign optimization (`Purchase` standard + custom event)

Reference repo: `Trainer-Goes-Online/ankita-prenatal`. The code patterns in this guide are extracted verbatim from that repo's `lib/analytics.ts`, `app/api/razorpay/verify-payment/route.ts`, `app/layout.tsx`, `components/CheckoutForm.tsx`, and `app/thank-you/page.tsx`.

---

## Section 1 — The drop-in prompt (paste this into the agent)

```
You're implementing the Meta tracking stack in this codebase. The full pattern is documented in META_TRACKING_AGENT_GUIDE.md — read it end to end before writing any code. The patterns there are extracted from a live, working reference implementation.

Your work proceeds in this order:

STEP 1 — AUDIT (report before editing)
Find and tell me:
- The root layout file (where the Meta Pixel base script lives, typically app/layout.tsx)
- The form component that collects user info before payment/submit
- The server route that handles successful payment verification (or form submission for lead-gen)
- The success page (typically /thank-you, /success, /confirmation)
- The payment provider (Razorpay/Stripe/PayPal/...) and the transaction id format it issues
- Form fields collected (email, phone, names, address, anything else)
- Any existing Meta integration code (fbq calls, CAPI logic, env vars)
- Free/test/coupon code path that should skip CAPI firing
- Whether the project uses Next.js App Router (assumed by reference pattern), Pages Router, or something else

Report in 6-10 bullets. Do not edit yet.

STEP 2 — PROPOSE
Based on the audit, tell me:
- Which files you'll create or modify
- What custom event name fits (default `sales` for paid product; `leads` for lead-gen; `signup` for free registration — match the project's terminology)
- How to thread event_source_url from client to server given the stack
- Which form fields map to which Meta user_data keys (em/ph/fn/ln/ct/country/db/zp/st/ge)
- Whether the project collects anything we DON'T currently send (e.g. DOB, postcode, gender) and could be added for EMQ
- The pixel ID and CAPI access token sources

Wait for my approval before editing.

STEP 3 — IMPLEMENT
Match the reference patterns in META_TRACKING_AGENT_GUIDE.md EXACTLY. The five files to land:
1. lib/analytics.ts (or equivalent analytics module) — MAM helper with cookie persistence + Web Crypto SHA-256 hashing
2. app/api/.../verify-payment/route.ts (or equivalent server route) — sendMetaCapiEvent firing TWO events per paid order: Purchase + custom (e.g. sales)
3. app/layout.tsx — Meta Pixel base + cookie-aware inline script that reads bw_mam BEFORE firing PageView
4. components/CheckoutForm.tsx (or equivalent form) — form-fill useEffect that fires MAM after 500ms debounce when all required fields are valid + filled
5. app/thank-you/page.tsx (or equivalent success page) — reapplyMamFromCookie() backup call on mount

DO NOT add a browser-side Purchase event. That's reserved for an escalation path documented in this guide.

STEP 4 — TYPE-CHECK / LINT
Run the project's type-checker. Must pass with no new errors.

STEP 5 — OUTPUT SIDE-BY-SIDE VERIFICATION TABLE (see Section 9 of this guide for the exact format)

STEP 6 — TELL ME WHAT THE MEDIA BUYER NEEDS TO DO
At the end of your output, give me a "Media buyer action list" — what Meta UI toggles to flip (auto events OFF, AAM OFF), what to verify in Events Manager, what diagnostic warnings to expect to clear. Reference META_BUYER_PLAYBOOK.md if it's in the project.

Show me the full output. I will manually verify against the reference repo's commit history.
```

---

## Section 2 — Architecture (what fires where, with what payload)

### Browser side (Meta Pixel via `fbq`)

| Event | When | Payload | event_id |
|---|---|---|---|
| **`PageView`** | Every initial page load + every Next.js client-side route change (Meta's SPA hook fires automatically) | Auto: IP, UA, `_fbp`, `_fbc`, `event_source_url`. Plus: `em`, `ph`, `fn`, `ln`, `ct`, `country`, `external_id` (hashed via SHA-256) if `bw_mam` cookie present | none |

That's it. **No browser-side `Purchase`, `InitiateCheckout`, `ViewContent`, `AddToCart`, or `Lead`** by default. Conversion events come from CAPI server-side.

### Server side (Conversions API)

Single HTTP POST to `https://graph.facebook.com/v25.0/{PIXEL_ID}/events?access_token={TOKEN}` per successful verified payment. Skipped entirely for free/test/QA orders.

Payload contains **two events** in the `data` array — both share `event_id`, `user_data`, `custom_data`, `event_source_url`:

| Event | event_name | Why |
|---|---|---|
| 1 | `Purchase` (standard) | Campaign optimization target. Mature global ML priors. iOS attribution (AEM is automatic since Oct 2024). |
| 2 | `<custom>` (e.g. `sales`/`leads`/`signup`) | Internal source-of-truth label. Excludes inferred Purchases or other sources. |

Both events ship with this `user_data` (11 matching signals = EMQ 9.5+):

| Field | Source | Hashed? | Format |
|---|---|---|---|
| `em` | email | SHA-256 | `[hashedHex]` |
| `ph` | dial code + phone | SHA-256 | `[hashedHex]` (digits only, no `+`) |
| `fn` | first name | SHA-256 | `[hashedHex]` (lowercase, trimmed) |
| `ln` | last name | SHA-256 | `[hashedHex]` (lowercase, trimmed) |
| `ct` | city | SHA-256 | `[hashedHex]` (lowercase, a-z only) |
| `country` | 2-letter ISO | SHA-256 | `[hashedHex]` (lowercase) |
| `external_id` | **same value as `em`** | SHA-256 | `[hashedHex]` — must match browser MAM |
| `fbc` | `_fbc` cookie | raw | string (if present) |
| `fbp` | `_fbp` cookie | raw | string (if present) |
| `client_ip_address` | request header | raw | string |
| `client_user_agent` | request header | raw | string |

Plus `custom_data`: `{ currency, value, payment_id }` and `event_source_url` (the URL the client was on when conversion happened — typically `/checkout`).

### How the data flows end-to-end

```
User journey:                            What ships to Meta:
─────────────────────                    ──────────────────────────────────────
1. Lands on /                            PageView (anonymous OR identified via cookie)
2. Clicks "Get Instant Access"           PageView fires for /checkout
3. Starts filling form                   nothing
4. Form valid + filled (500ms idle)      fbq init with hashed em/ph/fn/ln/ct/country/external_id
                                         + bw_mam cookie WRITTEN (30-day TTL)
5. Clicks "Pay"                          (still nothing — Razorpay opens)
6. Razorpay verifies payment             nothing
7. handlePaymentSuccess fires            await setMetaAdvancedMatching (refresh with latest)
                                         router.push('/thank-you')
                                         POST /api/verify-payment
                                           → server fires CAPI:
                                             { event_name: Purchase, event_id: pay_xxx, ... }
                                             { event_name: sales, event_id: pay_xxx, ... }
                                         (single HTTP call, both events)
8. /thank-you renders                    auto PageView with MAM inherited
                                         useEffect calls reapplyMamFromCookie (belt-and-braces)
9. User returns 5 days later             PageView fires on /
                                         inline script reads bw_mam → calls fbq init →
                                         PageView ships with full identity (EMQ ~8)
```

---

## Section 3 — Required env vars

```
META_PIXEL_ID              = <pixel ID from Events Manager>     # server-only, NO NEXT_PUBLIC_ prefix
META_CAPI_ACCESS_TOKEN     = <CAPI access token>                # server-only, NEVER add NEXT_PUBLIC_
```

The pixel ID also appears as a literal constant in `app/layout.tsx` (because it must be inlined in the client bundle anyway for `fbq('init', ...)`). Pixel IDs aren't secrets — they're already visible to anyone using the Meta Pixel Helper browser extension. The **access token** is server-only.

---

## Section 4 — Reference code (adapt to project specifics)

### 4.1 — `lib/analytics.ts` (the MAM helper module)

```ts
'use client';

// Mirror of the literal in app/layout.tsx so this helper can re-init the pixel
// with Advanced Matching. Pixel IDs aren't secrets - they're already exposed in
// the client bundle - so duplicating as a literal is fine.
const META_PIXEL_ID = '<PIXEL_ID>';

// First-party cookie that persists hashed MAM values across pages and sessions
// so every PageView (not just the one after form-fill) inherits user identity.
// 30-day TTL aligns with typical Meta attribution windows. Same-origin only,
// SameSite=Lax. Read by the inline pixel script in app/layout.tsx BEFORE the
// first PageView fires.
const MAM_COOKIE_NAME = 'bw_mam';                       // rename per project if desired
const MAM_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

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
 * Apply Meta-spec normalisation, SHA-256 hash each field, derive external_id
 * from the email hash, and return the matching object ready for fbq init.
 */
async function buildHashedMatching(data: {
  email?: string;
  phone?: string;       // raw with or without country code/dial code
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;     // 2-letter ISO; case-insensitive
  // Optional - add if the project's form collects these:
  // dateOfBirth?: string;  // YYYYMMDD format -> db
  // postcode?: string;     // -> zp
  // state?: string;        // 2-letter lowercase -> st
  // gender?: 'f' | 'm';    // -> ge
}): Promise<Record<string, string>> {
  const normalised: Record<string, string | undefined> = {};
  if (data.email)     normalised.em      = data.email.trim().toLowerCase();
  if (data.phone) {
    const digits = data.phone.replace(/\D/g, '');
    if (digits) normalised.ph = digits;
  }
  if (data.firstName) normalised.fn      = data.firstName.trim().toLowerCase();
  if (data.lastName)  normalised.ln      = data.lastName.trim().toLowerCase();
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
  // (developers.facebook.com -> External ID). Must be CONSISTENT across
  // browser Pixel and CAPI for the same user. Same hash as em (sha256 of
  // normalised email) so it's deterministic per user across sessions and
  // channels. Meta caches the external_id -> Facebook user mapping.
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
 * form values - this helper SHA-256 hashes them client-side via Web Crypto,
 * persists the hashed values to a first-party cookie, then calls fbq init
 * with the matching object so all subsequent pixel events inherit it.
 *
 * Call in three places:
 *   1. Form-fill useEffect (earliest moment we know identity)
 *   2. Payment success handler (refresh with latest values)
 *   3. /thank-you mount as reapplyMamFromCookie() (safety net)
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
  window.fbq('init', META_PIXEL_ID, matching);
  writeMamCookie(matching);
}

/**
 * Re-fire MAM from the persisted cookie. Used on /thank-you mount as a safety
 * net in case the inline pixel script in layout.tsx raced the route change.
 * fbq init is idempotent so calling it again with the same matching is no-op.
 */
export function reapplyMamFromCookie() {
  if (typeof window === 'undefined' || !window.fbq) return;
  const matching = readMamCookie();
  if (!matching || Object.keys(matching).length === 0) return;
  window.fbq('init', META_PIXEL_ID, matching);
}
```

### 4.2 — Server CAPI handler (`app/api/.../verify-payment/route.ts`)

```ts
import crypto from 'crypto';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const CUSTOM_EVENT_NAME = 'sales'; // or 'leads', 'signup' - per project

async function sendMetaCapiEvent(params: {
  pixelId: string;
  accessToken: string;
  paymentId: string;       // unique per transaction - used as event_id
  email: string;
  phone: string;           // dial code + number, raw
  firstName: string;
  lastName: string;
  city: string;
  countryCode: string;     // 2-letter ISO
  eventSourceUrl: string;  // URL the user was on at conversion
  fbc: string | undefined;
  fbp: string | undefined;
  clientIp: string | undefined;
  clientUserAgent: string | undefined;
  valueRupees: number;     // major units (rupees / dollars), NOT paise/cents
  currency: string;        // ISO 4217 e.g. INR, USD
}) {
  // Email: lowercase + trim, then SHA-256.
  const normalisedEmail = params.email.trim().toLowerCase();
  const hashedEmail = sha256(normalisedEmail);

  // Phone: digits only (E.164 without +) before hashing.
  const rawPhone = params.phone.replace(/\D/g, '');
  const hashedPhone = rawPhone ? sha256(rawPhone) : undefined;

  // external_id: stable per-USER identifier per Meta's spec. Must be
  // CONSISTENT with the browser MAM value for the same user. Using
  // sha256(normalised email) gives us deterministic same-value-across-channels.
  const externalId = sha256(normalisedEmail);

  // fn/ln: lowercase + trim. ct: lowercase a-z only. country: 2-letter ISO lowercase.
  const fn = params.firstName.trim().toLowerCase();
  const ln = params.lastName.trim().toLowerCase();
  const ct = params.city.trim().toLowerCase().replace(/[^a-z]/g, '');
  const country = params.countryCode.trim().toLowerCase();

  const hashedFn      = fn      ? sha256(fn)      : undefined;
  const hashedLn      = ln      ? sha256(ln)      : undefined;
  const hashedCt      = ct      ? sha256(ct)      : undefined;
  const hashedCountry = country ? sha256(country) : undefined;

  // Shared base across both events. Same event_id means natural dedup
  // against any browser-side event with matching id (we don't fire browser
  // Purchase by default - see Section 7 for the escalation path).
  const baseEvent = {
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.paymentId,
    action_source: 'website',
    event_source_url: params.eventSourceUrl,
    user_data: {
      em: [hashedEmail],
      ...(hashedPhone   && { ph: [hashedPhone] }),
      ...(hashedFn      && { fn: [hashedFn] }),
      ...(hashedLn      && { ln: [hashedLn] }),
      ...(hashedCt      && { ct: [hashedCt] }),
      ...(hashedCountry && { country: [hashedCountry] }),
      external_id: [externalId],
      ...(params.fbc && { fbc: params.fbc }),
      ...(params.fbp && { fbp: params.fbp }),
      ...(params.clientUserAgent && { client_user_agent: params.clientUserAgent }),
      ...(params.clientIp        && { client_ip_address: params.clientIp }),
    },
    custom_data: {
      currency: params.currency,
      value: params.valueRupees,
      payment_id: params.paymentId,
    },
  };

  const events = [
    { ...baseEvent, event_name: 'Purchase' },
    { ...baseEvent, event_name: CUSTOM_EVENT_NAME },
  ];

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

// In the POST handler:
const metaPixelId = process.env.META_PIXEL_ID;
const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
if (metaPixelId && metaAccessToken && !isFreeOrder) {
  const fbc = req.cookies.get('_fbc')?.value;
  const fbp = req.cookies.get('_fbp')?.value;
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    undefined;
  const clientUserAgent = req.headers.get('user-agent') ?? undefined;
  const fullPhone = `${customer.dialCode}${customer.phone}`;
  // Fall back to production URL if client didn't send one
  const resolvedEventSourceUrl = eventSourceUrl || 'https://<production-domain>/<checkout-path>';
  try {
    await sendMetaCapiEvent({
      pixelId: metaPixelId,
      accessToken: metaAccessToken,
      paymentId: resolvedPaymentId,
      email: customer.email,
      phone: fullPhone,
      firstName: customer.firstName,
      lastName: customer.lastName,
      city: customer.city,
      countryCode: customer.countryCode,
      eventSourceUrl: resolvedEventSourceUrl,
      fbc, fbp, clientIp, clientUserAgent,
      valueRupees: paidAmountRupeesNumeric,
      currency: paidCurrency,
    });
  } catch (err) {
    console.error('[verify-payment] Meta CAPI error:', err);
  }
}
```

### 4.3 — `app/layout.tsx` (inline pixel script with cookie-aware MAM)

```tsx
const META_PIXEL_ID = '<PIXEL_ID>';

// In the layout render output:
{META_PIXEL_ID && (
  <>
    <Script id="meta-pixel-init" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${META_PIXEL_ID}');
      try {
        var m = document.cookie.match(/(?:^|;\\s*)bw_mam=([^;]+)/);
        if (m) {
          var mam = JSON.parse(decodeURIComponent(m[1]));
          if (mam && typeof mam === 'object' && Object.keys(mam).length) {
            fbq('init', '${META_PIXEL_ID}', mam);
          }
        }
      } catch (e) {}
      fbq('track', 'PageView');
    `}</Script>
    <noscript>
      <img height="1" width="1" style={{ display: 'none' }} alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
    </noscript>
  </>
)}
```

Adjust the cookie name in the regex if the project uses a name other than `bw_mam`.

### 4.4 — Form component (`components/CheckoutForm.tsx`)

```tsx
'use client';
import { useEffect } from 'react';
import { setMetaAdvancedMatching } from '@/lib/analytics';

// Inside the form component, after state declarations:

// Fire MAM as soon as the form is fully filled + valid - independent of
// whether the user pays. This identifies any subsequent pixel events AND
// persists hashed identity to the bw_mam cookie. Debounced 500ms.
useEffect(() => {
  const allFilled =
    fields.firstName.trim() &&
    fields.lastName.trim() &&
    fields.email.trim() &&
    fields.city.trim() &&
    fields.phone.trim();
  if (!allFilled) return;
  const currentErrors = validateFields(fields, countryCode);
  if (Object.keys(currentErrors).length > 0) return;
  const selected = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const timer = setTimeout(() => {
    void setMetaAdvancedMatching({
      email: fields.email,
      phone: `${selected.dial}${fields.phone}`,
      firstName: fields.firstName,
      lastName: fields.lastName,
      city: fields.city,
      country: countryCode,
    });
  }, 500);
  return () => clearTimeout(timer);
}, [fields, countryCode]);

// In the payment success handler, BEFORE router.push:
await setMetaAdvancedMatching({
  email: fields.email,
  phone: `${dialCode}${fields.phone}`,
  firstName: fields.firstName,
  lastName: fields.lastName,
  city: fields.city,
  country: countryCode,
});
// Then redirect:
router.push('/thank-you?...');
```

Also: in the verify-payment fetch body, pass `eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined`.

### 4.5 — Success page (`app/thank-you/page.tsx`)

```tsx
'use client';
import { useEffect } from 'react';
import { reapplyMamFromCookie } from '@/lib/analytics';

useEffect(() => {
  // Backup safety net: re-apply MAM from the persisted bw_mam cookie in case
  // the inline pixel script raced the route change OR the form-fill MAM
  // call didn't complete before redirect.
  reapplyMamFromCookie();
}, []);
```

---

## Section 5 — Adapting to project variations

The reference repo collects: firstName, lastName, email, phone (+ country code), city. About 90% of funnels collect the same shape. For the 10% that differ:

### Extra fields the form might collect

| Form field | Maps to | Format before hashing |
|---|---|---|
| Date of birth | `db` | `YYYYMMDD` (e.g. `19910526`) |
| Postcode / PIN code | `zp` | lowercase, alphanumeric only |
| State / region | `st` | 2-letter lowercase (US/IN) or full lowercase name |
| Gender | `ge` | `f` or `m` (single char, lowercase) |
| Address line 1 | (no Meta field — skip) | — |

If the form collects any of these, ADD them to:
1. `buildHashedMatching` input + normalisation in `lib/analytics.ts`
2. The `setMetaAdvancedMatching` call sites in the form component
3. The `sendMetaCapiEvent` params + user_data block in the server route

Each additional field adds ~6-11% to EMQ per Meta's recommendations panel.

### Custom event name

| Funnel type | Suggested `event_name` |
|---|---|
| Paid product / course | `sales` |
| Free webinar / lead capture | `leads` |
| Account signup / app install | `signup` |
| Booking / appointment | `booking` |
| Quote request | `quote_request` |

Pick one, set it as a constant in `lib/checkout-config.ts` or equivalent so it's a single source of truth.

### Payment provider mapping

| Provider | Transaction ID source | event_id value |
|---|---|---|
| Razorpay | `razorpay_payment_id` from modal response | `pay_xxx` |
| Stripe | PaymentIntent id | `pi_xxx` |
| PayPal | `txn_id` from PDT/IPN | `transaction-id` |
| Cashfree | `cf_payment_id` | UUID |
| PhonePe | `merchantTransactionId` | UUID |
| Direct bank transfer | server-generated UUID | UUID |

Whatever the project uses, that becomes the CAPI `event_id` AND the `payment_id` in `custom_data`.

### Free / test / QA order skip

Whatever the project's pattern is, the CAPI block must be guarded by it. Examples:
- Reference repo: `if (metaPixelId && metaAccessToken && !isFreeOrder)`
- Stripe test mode: `if (!stripePaymentIntent.livemode) skip`
- Custom coupon: `if (coupon?.code !== 'FREEQA') fire`

CAPI fires only for real revenue events.

### Cookie name

The reference repo uses `bw_mam` (BodyWorx). For other clients, you can rename to anything (e.g. `ankita_mam`, `acme_mam`, `funnel_mam`). The regex in `app/layout.tsx` inline script must match whatever you choose. Keep it consistent within the project.

---

## Section 6 — Verification checklist

After implementation:

| Check | How |
|---|---|
| Type-check / lint passes | `npm run type-check` (or project equivalent) |
| Cookie `bw_mam` is written after form fill | DevTools → Application → Cookies → look for the cookie after entering valid form data |
| Cookie contains 7 SHA-256 hex hashes | Each value should be 64 chars `[0-9a-f]`. Keys: `em, ph, fn, ln, ct, country, external_id`. The `em` and `external_id` values should be IDENTICAL. |
| Meta Pixel Helper extension shows PageView with MAM | After form fill, refresh `/checkout` or visit `/thank-you`. Pixel Helper → Advanced Matching Parameters Sent should list em/ph/fn/ln/ct/country/external_id |
| Server CAPI fires both events | Run a test payment, check server logs for `Meta CAPI event sent` with `events_received: 2` |
| Test Events tool shows both events | Events Manager → Test Events → run a test payment → should see `Purchase` AND `<custom>` (note: external_id is NOT shown in Test Events per Meta's docs — that's expected) |
| EMQ ≥ 9.5 on Purchase and `<custom>` | Wait 24h after first real conversion, check Events Manager → Purchase row → EMQ column |
| event_source_url populated | Check any CAPI event in the Events Manager event preview |
| Free/test orders skipped | Run a free coupon flow, confirm CAPI logs show "skipped" or equivalent |

---

## Section 7 — When to add browser-side `Purchase` (escalation only)

**Do NOT add this by default.** The reference repo learned the hard way that with the right Meta UI toggles off (auto events OFF, AAM OFF), the server-only CAPI Purchase is sufficient and cleaner.

### Add browser-side Purchase ONLY when the media buyer reports one of these symptoms:

| Symptom | What it means |
|---|---|
| Events Manager → Diagnostics shows **"Improve deduplication for Purchase event"** notice | Meta is receiving Purchase events from multiple sources without matching `event_id` — dedup is failing |
| In Events Manager, `Purchase` event count is **significantly higher than `<custom>` event count** (e.g. 86 vs 25, or >20% delta in either direction) | Something else (auto-inference, third-party script) is firing Purchase outside our code. We need a deterministic browser-side Purchase with `event_id` to participate in dedup |
| Campaign Results column shows conversion count substantially different from real transaction count (Pabbly / payment-provider records) | Attribution is broken; dedup or auto-inference is creating phantom or missed conversions |
| Purchase EMQ drops below 9.0 despite CAPI implementation being correct | Low-quality inferred Purchases are polluting the average |

### When triggered, add this code

In `lib/analytics.ts`:

```ts
/**
 * Fire the Meta Pixel standard 'Purchase' event from the browser, paired
 * with the server CAPI Purchase event of the same event_id for dedup
 * (Meta's dedup spec: same event_name + same event_id within 48h = one
 * event for attribution; raw counts in Events Manager dashboard still
 * show both, but campaign Results column reads deduped count).
 *
 * Call AFTER setMetaAdvancedMatching so the Purchase event inherits the
 * hashed user identity for high EMQ.
 */
export function trackPurchasePixel(params: {
  paymentId: string;        // used as eventID - must match server event_id
  value: number;            // major units (rupees/dollars), same as CAPI
  currency?: string;
  contentName?: string;
}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq(
    'track',
    'Purchase',
    {
      value: params.value,
      currency: params.currency ?? 'INR',
      content_name: params.contentName ?? 'Checkout',
    },
    { eventID: params.paymentId },
  );
}
```

In the form's payment-success handler, AFTER `setMetaAdvancedMatching` and BEFORE `router.push`:

```ts
trackPurchasePixel({
  paymentId: response.<provider>_payment_id,
  value: result.amount ?? CHECKOUT_CONFIG.amountRupeesNumeric,
  currency: result.currency ?? 'INR',
  contentName: CHECKOUT_CONFIG.brandName,
});
```

After deploying this, the campaign Results column will normalise to the real conversion count (because dedup attribution kicks in via matching `event_id`). The Events Manager dashboard total will still show `~2× real` (raw browser + raw server counted separately) — that's expected and only affects the diagnostic view, not optimization.

---

## Section 8 — Anti-patterns (do not do)

| Mistake | Why it breaks things |
|---|---|
| Hashing `fbc`/`fbp`/IP/UA | These are sent RAW. Hashing breaks them as matching signals. |
| Pre-hashing `em`/`ph`/`fn`/`ln`/`ct`/`country` in code AND ALSO calling Meta's `fbq` with raw values | Double-hashing. Meta detects 64-char hex as already-hashed; either pre-hash OR send raw, not both for the same field. |
| Sending `value` in paise/cents | Meta expects major units. 297 not 29700. |
| Sending the custom event WITHOUT standard `Purchase` | Custom events have no global ML priors. Standard `Purchase` benefits from billions of cross-account training events. |
| Skipping `event_source_url` | Required for `action_source: 'website'` since Feb 2021. Restricted categories (health, financial) have a 60-day enforcement deadline before events are dropped. |
| Configuring AEM event priorities | Meta deprecated the 8-event AEM cap and manual prioritization UI in Oct 2024. AEM is now automatic. If "Web Events Configuration" doesn't exist in Events Manager, that's the new normal. |
| Adding browser `Purchase` by default | See Section 7 — only add on escalation. Default firing creates dedup complexity and inflated dashboard counts. |
| `external_id` that changes per transaction | external_id MUST be user-stable. Use `sha256(normalised_email)` not `sha256(email\|payment_id)`. |
| Different `external_id` value on browser vs CAPI | Meta requires consistency across channels for the same user. |
| Optimizing campaign on custom event instead of `Purchase` | Custom events have no global ML priors. Default to Purchase. Switch only in rare cases (multiple funnels sharing one pixel — see buyer playbook). |
| Forgetting the free/test order guard | QA transactions get reported as real conversions — algorithm learns the wrong audience. |
| Allow-listing staging/preview domains in Meta | Vercel preview URL events pollute production pixel. Allow-list production domain only. |

---

## Section 9 — Final output the agent must produce

After implementation, the agent's response must end with this exact structure:

```
## Changes made

### File 1: <path to MAM helper module>
- <bullet list of changes>

### File 2: <path to server CAPI route>
- <bullet list>

### File 3: <path to root layout>
- <bullet list>

### File 4: <path to form component>
- <bullet list>

### File 5: <path to success page>
- <bullet list>

## Verification checklist for the user

[ ] Type-check / lint passes
[ ] bw_mam cookie written after form fill (DevTools → Application → Cookies)
[ ] Cookie contains 7 SHA-256 hex hashes including external_id (= em value)
[ ] Meta Pixel Helper shows MAM fields on /thank-you PageView
[ ] Server CAPI logs show 2 events sent per real payment
[ ] Events Manager Test Events shows Purchase + <custom> events
[ ] event_source_url populated
[ ] Free/test orders do NOT fire CAPI events

## Side-by-side comparison with the reference repo

| Aspect                          | Reference (Prenatal repo)                          | This project |
|---------------------------------|----------------------------------------------------|--------------|
| MAM helper location             | lib/analytics.ts                                   | ?            |
| MAM helper name                 | setMetaAdvancedMatching                            | ?            |
| Cookie name                     | bw_mam                                             | ?            |
| Cookie TTL                      | 30 days                                            | ?            |
| Pixel ID source                 | Literal mirrored in lib/analytics + layout         | ?            |
| Server route path               | app/api/razorpay/verify-payment/route.ts           | ?            |
| Payment provider                | Razorpay                                           | ?            |
| Transaction ID source           | razorpay_payment_id                                | ?            |
| Custom event name               | sales                                              | ?            |
| Hashed PII fields sent (CAPI)   | em, ph, fn, ln, ct, country, external_id           | ?            |
| Server-context fields (CAPI)    | fbc, fbp, IP, UA                                   | ?            |
| external_id formula             | sha256(normalised email)                           | ?            |
| event_source_url source         | window.location.href from client                   | ?            |
| Free-order guard (server)       | !isFreeOrder                                       | ?            |
| Form-fill MAM trigger           | useEffect, 500ms debounce on valid+filled fields   | ?            |
| Inline pixel script reads cookie| Yes, BEFORE fbq('track', 'PageView')               | ?            |
| /thank-you backup MAM           | reapplyMamFromCookie() in useEffect                | ?            |
| Browser Purchase event          | NOT FIRED (default) - escalation only              | ?            |
| Auto Event Detection toggle     | User flips OFF in Events Manager                   | ?            |
| Automatic Advanced Matching toggle | User flips OFF in Events Manager                | ?            |

## Notes / decisions
<List any project-specific deviations from the standard pattern>

## Media buyer action list
After this code deploys, ask the media buyer to:
1. Verify Events Manager → Pixel Settings → "Track events automatically without code" is OFF
2. Verify Events Manager → Pixel Settings → "Automatic Advanced Matching" is OFF
3. Verify production domain is on the Events Manager allow list (Pixel Settings → Traffic permissions)
4. Run a test purchase, confirm in Test Events that BOTH events arrive with EMQ 9.5+
5. Hand them META_BUYER_PLAYBOOK.md for the ongoing monitoring + escalation playbook
```

---

## Section 10 — Reference repo & commit history

Live working implementation: [github.com/Trainer-Goes-Online/ankita-prenatal](https://github.com/Trainer-Goes-Online/ankita-prenatal). Key commits in order:

| Commit | What landed |
|---|---|
| `11b7e48` | CAPI dual-event firing (Purchase + sales) with EMQ payload + event_source_url |
| `eb59d50` | Manual Advanced Matching on payment success |
| `ae663fc` | external_id on CAPI + persistent bw_mam cookie + browser PageView with cookie-read MAM |
| `7efe8d5` | external_id corrected to user-stable sha256(email), aligned with Meta's spec |

If the agent's diff doesn't match this pattern, that's a deliberate deviation that should be flagged in "Notes / decisions" — never silent.
