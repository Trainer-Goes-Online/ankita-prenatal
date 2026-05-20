# Meta Conversions API — Optimization Pattern (drop-in guide)

**Purpose.** Replicate the high-EMQ, AEM-safe, restricted-category-compliant CAPI pattern from the BodyWorx Prenatal project into any sibling funnel (postpartum, fertility, fitness, course launches, lead-gen, etc.). Same outcome: lowest possible CPR, highest possible Event Match Quality, no Meta diagnostic warnings.

Pattern reference repo: `Trainer-Goes-Online/ankita-prenatal`, file `app/api/razorpay/verify-payment/route.ts`.

---

## What this pattern does (in one paragraph)

Every successful paid transaction triggers **a single server-side HTTP call to Meta's Conversions API that contains TWO events** in one payload: the standard `Purchase` event (used for campaign optimization, benefits from Meta's mature global ML priors and iOS attribution) AND a project-specific custom event (e.g. `sales`, `leads`, `signup`) used as the internal source-of-truth label. Both events share the same `event_id` (the payment/transaction ID) and the same full `user_data` block (hashed email, phone, first name, last name, city, country, plus raw fbc/fbp cookies, IP, user agent). Both events include `event_source_url` so they survive Meta's restricted-category enforcement. The **client-side pixel fires `PageView` AND a paired standard `Purchase`** with `eventID = transactionID` and Manual Advanced Matching attached, so Meta dedupes the browser Purchase against the server CAPI Purchase by event_id within a 48h window. The custom `sales` event is server-only (never fired from browser) — it's our internal authoritative label and has no browser pair to dedupe against, by design. Free QA-coupon transactions are skipped entirely on both sides.

---

## Why this works (the four mechanisms)

1. **High EMQ via 11 matching signals.** Meta scores Event Match Quality from the user_data block. Sending 6 hashed PII fields + 4 server-context fields + event_source_url pushes EMQ to 9+/10, which multiplies the attribution rate from ~40-60% (URL-inferred) to 85-95%. More attributed conversions → algorithm learns faster → CPR drops.
2. **Standard `Purchase` benefits from Meta's mature global ML priors.** Meta's algorithm has billions of `Purchase` events to learn from globally — custom event names start cold with no semantic understanding. iOS attribution (post-Oct 2024 AEM update) is now automatic, but standard events still receive preferential handling in Meta's models. Firing `Purchase` keeps you in the well-trodden path.
3. **Restricted-category compliance via event_source_url.** Since Feb 2021 Meta requires `event_source_url` for all `action_source: 'website'` events; for restricted categories (health, financial, pregnancy, political) Meta now strictly enforces it with a 60-day blocking deadline. Including it from day 1 prevents events being silently dropped.
4. **Dedup safety via shared event_id (browser ↔ server `Purchase` pair).** The browser pixel fires `Purchase` with `eventID = transactionID`; the server CAPI fires `Purchase` with the same `event_id`. Same event_name + same event_id within Meta's 48h window → Meta collapses them into ONE counted conversion. Without the browser pair, Meta's dedup coverage drops to 0% AND Meta's Automatic Event Detection (Event Setup Tool) starts synthesising uncontrolled Purchase events from page metadata that have no event_id and can't be deduped — this is exactly the failure mode that caused the ankita-prenatal pixel to show 49 Purchase events for 16 real sales before this pattern was adopted. The custom `sales` event is server-only — different event_name from `Purchase` so it does not dedupe with it, and there's no browser counterpart by design (it's our internal source-of-truth label).

---

## Required environment variables

```
META_PIXEL_ID              = <pixel ID from Events Manager>     # server-only, no NEXT_PUBLIC_ prefix
META_CAPI_ACCESS_TOKEN     = <CAPI access token>                # server-only, NEVER add NEXT_PUBLIC_
```

The pixel ID may also appear as a client-side literal for the browser PageView pixel — that's fine, pixel IDs are not secrets. The **access token** must never have `NEXT_PUBLIC_` prefix and must never appear in client bundles.

---

## Exact event payload to send (Meta CAPI v25.0+)

POST to `https://graph.facebook.com/v25.0/{META_PIXEL_ID}/events?access_token={META_CAPI_ACCESS_TOKEN}`

```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": <unix_seconds>,
      "event_id": "<transaction_id>",
      "action_source": "website",
      "event_source_url": "https://<production-domain>/<page-where-conversion-happened>",
      "user_data": {
        "em":  ["<sha256(lowercase(trim(email)))>"],
        "ph":  ["<sha256(digits_only(phone))>"],
        "fn":  ["<sha256(lowercase(trim(firstName)))>"],
        "ln":  ["<sha256(lowercase(trim(lastName)))>"],
        "ct":  ["<sha256(lowercase(strip_nonalpha(city)))>"],
        "country": ["<sha256(lowercase(2letter_iso_country_code))>"],
        "fbc": "<raw _fbc cookie or omit>",
        "fbp": "<raw _fbp cookie or omit>",
        "client_ip_address": "<first IP in x-forwarded-for or omit>",
        "client_user_agent": "<user-agent header or omit>"
      },
      "custom_data": {
        "currency": "<ISO 4217 e.g. INR, USD>",
        "value": <numeric amount in major units, e.g. 297, NOT in paise/cents>,
        "payment_id": "<transaction_id>"
      }
    },
    {
      "event_name": "<custom event name, e.g. sales / leads / signup>",
      "event_time": <same unix_seconds>,
      "event_id": "<same transaction_id>",
      "action_source": "website",
      "event_source_url": "<same URL>",
      "user_data": { /* identical to above */ },
      "custom_data": { /* identical to above */ }
    }
  ]
}
```

Both events are sent in a **single HTTP call** as two entries in the `data` array. Do NOT send them as two separate HTTP calls.

---

## Normalization rules (Meta spec, exact)

Before SHA-256 hashing, apply these transforms:

| Field | Rule | Example: `"  Jane Doe  "` → |
|---|---|---|
| `em` (email) | trim, lowercase | `"  Jane@DOE.com "` → `"jane@doe.com"` |
| `ph` (phone) | strip all non-digits (E.164 without `+`) | `"+91 98765-43210"` → `"919876543210"` |
| `fn`, `ln` (names) | trim, lowercase | `"  Jane  "` → `"jane"` |
| `ct` (city) | trim, lowercase, strip everything that's not a-z (no spaces, no punctuation) | `"New Delhi"` → `"newdelhi"` |
| `country` (country) | trim, lowercase, 2-letter ISO 3166-1 alpha-2 | `"IN"` → `"in"` |

Always hash with **SHA-256**, output as **lowercase hex string**.

`fbc`, `fbp`, `client_ip_address`, `client_user_agent`, `event_source_url`, `value`, `currency`, `payment_id` are sent **unhashed** (raw values).

---

## Where event_source_url comes from

The conversion happens on the page where the user submitted the order — typically `/checkout` or whatever your funnel calls it. Best practice: have the client send `window.location.href` in the body of the verify-payment request. Server uses that value directly. Fallback to a hardcoded production URL if the field is missing.

```ts
// Client (form submit handler):
fetch('/api/verify-payment', {
  method: 'POST',
  body: JSON.stringify({
    /* ...other fields */
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  }),
});

// Server:
const resolvedEventSourceUrl =
  eventSourceUrl || 'https://<your-production-domain>/<checkout-path>';
```

The URL must resolve to a domain in Meta's allow list (Events Manager → dataset settings). Localhost / staging / vercel.app URLs will have their events dropped if those domains aren't allow-listed.

---

## Client-side pixel: PageView in layout + Purchase on success (with matching eventID)

In your root layout/template, fire `PageView` on every page load. In the checkout/order-confirmation success path, also fire a paired `Purchase` event with `eventID = transactionID` — the same id used as `event_id` in the server CAPI Purchase call. This is the official Meta-supported dedup pattern.

### 1. Root layout — base pixel + PageView

```html
<!-- Meta Pixel base, fires PageView automatically -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);
t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '<META_PIXEL_ID>');
fbq('track', 'PageView');
</script>
```

### 2. Checkout success path — MAM init → Purchase track → redirect

Order is critical. MAM must be set **before** `fbq('track', 'Purchase', ...)` so the Purchase event inherits the hashed identity (`em`, `ph`, `fn`, `ln`, `ct`, `country`) and lands at 9+/10 Event Match Quality on the browser side as well. Both calls happen **before** `router.push` to the thank-you page so Meta's auto-PageView on the next route also carries MAM.

```ts
// In the verify-payment success handler, right before redirect:
setMetaAdvancedMatching({
  email: fields.email,
  phone: `${dialCode}${fields.phone}`,
  firstName: fields.firstName,
  lastName: fields.lastName,
  city: fields.city,
  country: countryCode,
});

window.fbq?.(
  'track',
  'Purchase',
  {
    value: result.amount,             // numeric, major units (rupees), same as CAPI
    currency: result.currency,        // ISO 4217
    content_name: '<offer-name>',     // display label in Events Manager
  },
  { eventID: response.razorpay_payment_id }, // === server event_id
);

router.push('/thank-you?...');
```

The helper lives in `lib/analytics.ts` as `trackPurchasePixel({ paymentId, value, currency, contentName })`.

### 3. Custom server-only events stay server-only

The custom `sales` (or `leads`, `signup`) event is **never** fired from the browser. It exists as a different event_name so it does not dedupe with `Purchase` — it's the agency's internal source-of-truth label, and intentionally has no client-side counterpart. Do not add `fbq('track', 'sales', ...)`.

### 4. Free / QA / coupon paths fire NEITHER browser Purchase NOR server CAPI

The server already skips CAPI when `isFreeOrder` is true. The browser must do the same — do not fire `fbq('track', 'Purchase', ...)` for ₹0 transactions, or test purchases will inflate the Purchase count.

---

## Skip free / test transactions

Whatever your "free coupon" / "QA" code path looks like, the CAPI block must not fire for it. In the reference repo:

```ts
if (metaPixelId && metaAccessToken && !isFreeOrder) {
  await sendMetaCapiEvent({ /* ... */ });
}
```

Otherwise your testing pollutes the pixel with conversions that didn't really happen → Meta's algorithm learns the wrong audience → CPR goes up.

---

## Implementation checklist (work through this top-to-bottom)

For an agent rolling this out into a new project:

- [ ] **Identify the verify-payment / order-confirmation server route** in the target project. It's wherever the payment provider's success webhook or signature verification lands.
- [ ] **Identify the form data captured at checkout.** At minimum you need: email, phone (with country code), first name, last name. City and country are highly recommended for EMQ. Adjust the hashing block in `sendMetaCapiEvent` to whatever fields the form actually collects — never invent fields the form doesn't capture.
- [ ] **Identify the transaction ID** the payment provider issues (Razorpay `payment_id`, Stripe `pi_xxx`, PayPal `txn_id`, etc.). Use this as `event_id` — must be unique per transaction.
- [ ] **Pick a custom event name.** Convention: `"sales"` for paid-product funnels, `"leads"` for lead-gen, `"signup"` for free registration. Whatever you pick, it must be consistent across the codebase (config constant) so reports stay clean.
- [ ] **Add `event_source_url` plumbing.** Client sends `window.location.href`; server reads it from the request body; fallback to hardcoded production URL if missing.
- [ ] **Add all 6 hashed user_data fields** (`em`, `ph`, `fn`, `ln`, `ct`, `country`) using the normalization rules above.
- [ ] **Add the 4 server-context fields** (`fbc` and `fbp` from request cookies; `client_ip_address` from `x-forwarded-for` header; `client_user_agent` from request headers).
- [ ] **Build the `data` array with TWO events** (`Purchase` + custom name) sharing `event_id`, `event_source_url`, `user_data`, and `custom_data`. Send in a single POST.
- [ ] **Confirm the client-side pixel fires `PageView`** in the root layout, AND fires a paired browser-side `Purchase` from the checkout success handler with `eventID = transactionID` — same id used as server `event_id` so Meta can dedupe. Browser Purchase fires AFTER `setMetaAdvancedMatching` and BEFORE `router.push`. Do not fire the custom (`sales`/`leads`/`signup`) event from the browser — that's server-only by design.
- [ ] **Confirm the CAPI block AND the browser Purchase call are both guarded** against free/test orders (`!isFreeOrder` or equivalent on both sides — they must stay symmetric).
- [ ] **Turn off "Track events automatically without code"** in Events Manager → Dataset settings (also called Event Setup Tool / Automatic Event Detection). With this on, Meta synthesises uncontrolled browser Purchase events from page metadata that have no event_id and can't be deduped — guaranteed to inflate Purchase counts. Off is the only correct setting once we ship explicit Purchase tracking.
- [ ] **Add the production domain to Meta's Allow List** in Events Manager → dataset settings → Traffic permissions. Only the production domain; do not allow-list staging or preview URLs unless intentionally testing.
- [ ] **Run a test transaction** with the Test Events tool open in Events Manager. Confirm both events arrive with EMQ 9+/10.

---

## Final output the agent must produce

After making the changes, the agent should output a structured summary the user can verify manually:

```
## Changes made

### File 1: <path to verify-payment route>
- Replaced single-event CAPI call with dual-event (Purchase + <custom>) array
- Added event_source_url field, sourced from request body with production fallback
- Added hashed user_data fields: fn, ln, ct, country (in addition to existing em, ph)
- Confirmed isFreeOrder guard wraps the CAPI block

### File 2: <path to client checkout form>
- Added `eventSourceUrl: window.location.href` to both verify-payment fetch calls
  (paid path AND free-coupon path, for symmetry — server ignores it on free)
- Added `trackPurchasePixel({ paymentId, value, currency, contentName })` call
  in the PAID success handler only (free-coupon path stays bare).
  Order: setMetaAdvancedMatching → trackPurchasePixel → router.push.

### File 3: <path to lib/analytics.ts>
- Added trackPurchasePixel helper that fires fbq('track', 'Purchase', {...},
  { eventID: paymentId }) — eventID equals server event_id so Meta dedupes.
- setMetaAdvancedMatching helper unchanged (still required, still called first).

### File 4: <path to root layout, if applicable>
- Pixel base fires PageView on every page load (unchanged).
- No fbq('track', 'sales' | 'leads' | 'signup' | ...) in client code —
  custom events are server-only.

### File 5: <path to env example, if applicable>
- META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are server-only (no NEXT_PUBLIC_ prefix)

## Verification checklist for the user

[ ] npm run type-check passes
[ ] Events Manager → Dataset settings: "Track events automatically without code" is OFF
[ ] Run a test purchase locally; confirm in dev console:
    [verify-payment] Meta CAPI event sent: { events_received: 2, ... }
[ ] In Events Manager Test Events: both "Purchase" (server) and "<custom>" appear
[ ] Browser-side "Purchase" also appears in Test Events with the same eventID
    as the server "Purchase" event → status: "Deduplicated"
[ ] EMQ shows 9+/10 on all three rows
[ ] event_source_url field is populated in the event preview
[ ] 24–72h later, Diagnostics shows Purchase dedup coverage rate ≥ 75%

## Notes / decisions
<List any project-specific deviations from the standard pattern>
```

---

## Anti-patterns to avoid (common mistakes)

| Mistake | Why it breaks things |
|---|---|
| Sending events one at a time in separate HTTP calls | Wastes API quota, complicates dedup, no atomicity. Always batch into one `data: [...]` array. |
| Hashing fbc/fbp/IP/UA | These are sent **raw**. Hashing breaks them as matching signals. |
| Sending `value` in paise/cents | Meta expects major units (rupees, dollars). 297 not 29700. |
| Sending the custom event without the standard `Purchase` | Custom events have no global model priors — Meta has no semantic understanding of "sales" until per-account training accumulates. Standard `Purchase` benefits from billions of cross-account training events. |
| Firing browser `Purchase` WITHOUT `eventID` (or with a different id from the server) | Meta cannot pair them — both events count separately. Doubles your reported Purchase count and tanks dedup coverage. The `eventID` browser ↔ `event_id` server must be exactly equal (case-sensitive). |
| Firing browser `Purchase` for free / coupon / QA orders | Server skips CAPI for free orders, so the browser Purchase has no pair to dedupe against → it counts as a real ₹0 Purchase. Always wrap the browser Purchase call in the same `!isFreeOrder` guard the server uses. |
| Leaving "Track events automatically without code" ON in Events Manager | Meta will synthesise its own Purchase events from page metadata (button text, URL patterns). These have no eventID, can't be deduped, and inflate counts indefinitely. **Must be turned OFF on every pixel.** This was the root cause of the 49-vs-16 incident on ankita-prenatal. |
| Firing the custom event (`sales`/`leads`/`signup`) from the browser | Custom events are server-only — they're the agency's authoritative internal label and have no browser pair by design. Firing from browser breaks the "sales == real conversions" invariant. |
| Skipping `event_source_url` because "we don't have a URL server-side" | Always pass from client. If you can't, hardcode the production checkout URL as a fallback. Without it, restricted-category accounts will have events dropped after the 60-day enforcement deadline. |
| Trying to configure AEM event priorities | Meta deprecated the 8-event AEM cap and the manual prioritization UI in Oct 2024. AEM is now automatic. If you see no "Web Events Configuration" tab in Events Manager, that's the new normal — don't open a support ticket. |
| Optimizing campaigns on the custom event instead of Purchase | Loses Meta's mature global algorithm priors. Custom events start cold. Only do this in the rare cases described in `META_BUYER_PLAYBOOK.md`. |
| Forgetting the free-coupon guard | Test/QA transactions get reported to Meta as real conversions → algorithm learns the wrong audience. |
| Allow-listing staging/preview domains in Meta | Events from preview URLs flood the pixel with non-real traffic during development. Allow-list production domain only. |

---

## Reference implementation

Full working code: see [Trainer-Goes-Online/ankita-prenatal](https://github.com/Trainer-Goes-Online/ankita-prenatal), specifically:
- `app/api/razorpay/verify-payment/route.ts` — server-side CAPI dual-event handler
- `components/CheckoutForm.tsx` — client-side `eventSourceUrl` plumbing
- `app/layout.tsx` — client pixel firing only `PageView`
- `lib/analytics.ts` — confirmation that no client-side `fbq('track', ...)` conversion events remain
- `docs/META_BUYER_PLAYBOOK.md` — media buyer / ops team playbook after deploy
