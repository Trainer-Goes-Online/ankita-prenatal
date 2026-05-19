# Meta Conversions API — Optimization Pattern (drop-in guide)

**Purpose.** Replicate the high-EMQ, AEM-safe, restricted-category-compliant CAPI pattern from the BodyWorx Prenatal project into any sibling funnel (postpartum, fertility, fitness, course launches, lead-gen, etc.). Same outcome: lowest possible CPR, highest possible Event Match Quality, no Meta diagnostic warnings.

Pattern reference repo: `Trainer-Goes-Online/ankita-prenatal`, file `app/api/razorpay/verify-payment/route.ts`.

---

## What this pattern does (in one paragraph)

Every successful paid transaction triggers **a single server-side HTTP call to Meta's Conversions API that contains TWO events** in one payload: the standard `Purchase` event (used for campaign optimization, benefits from Meta's mature global ML priors and iOS attribution) AND a project-specific custom event (e.g. `sales`, `leads`, `signup`) used as the internal source-of-truth label. Both events share the same `event_id` (the payment/transaction ID) and the same full `user_data` block (hashed email, phone, first name, last name, city, country, plus raw fbc/fbp cookies, IP, user agent). Both events include `event_source_url` so they survive Meta's restricted-category enforcement. Client-side pixel fires only `PageView` (plus Manual Advanced Matching on the success page redirect — see `AGENT_PROMPT_META_MAM_ROLLOUT.md`). Free QA-coupon transactions are skipped entirely.

---

## Why this works (the four mechanisms)

1. **High EMQ via 11 matching signals.** Meta scores Event Match Quality from the user_data block. Sending 6 hashed PII fields + 4 server-context fields + event_source_url pushes EMQ to 9+/10, which multiplies the attribution rate from ~40-60% (URL-inferred) to 85-95%. More attributed conversions → algorithm learns faster → CPR drops.
2. **Standard `Purchase` benefits from Meta's mature global ML priors.** Meta's algorithm has billions of `Purchase` events to learn from globally — custom event names start cold with no semantic understanding. iOS attribution (post-Oct 2024 AEM update) is now automatic, but standard events still receive preferential handling in Meta's models. Firing `Purchase` keeps you in the well-trodden path.
3. **Restricted-category compliance via event_source_url.** Since Feb 2021 Meta requires `event_source_url` for all `action_source: 'website'` events; for restricted categories (health, financial, pregnancy, political) Meta now strictly enforces it with a 60-day blocking deadline. Including it from day 1 prevents events being silently dropped.
4. **Dedup safety via shared event_id.** Both events use the transaction ID as `event_id`. If a browser pixel ever fires `Purchase` with the same id within 48h, Meta dedupes (same event_name + same event_id rule). Custom event doesn't dedupe against `Purchase` because event_name differs.

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

## Client-side pixel: PageView ONLY

In your root layout/template, fire only `PageView`. **Do not fire `Purchase` from the browser pixel** — it duplicates the CAPI signal with lower quality (no event_id-based dedup with CAPI, and ad blockers will drop ~30% of mobile events).

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

If your project has client-side helpers that previously fired `fbq('track', 'Purchase')` or `fbq('track', 'InitiateCheckout')`, **remove those calls.** CAPI handles all conversion tracking.

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
- [ ] **Confirm the client-side pixel fires only `PageView`** in the root layout. Remove any `fbq('track', 'Purchase'|'InitiateCheckout'|...)` calls in client helpers.
- [ ] **Confirm the CAPI block is guarded** against free/test orders (`!isFreeOrder` or equivalent).
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

### File 3: <path to root layout, if applicable>
- Client pixel fires only PageView
- No fbq('track', 'Purchase'|'InitiateCheckout'|...) anywhere in client code

### File 4: <path to env example, if applicable>
- META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are server-only (no NEXT_PUBLIC_ prefix)

## Verification checklist for the user

[ ] npm run type-check passes
[ ] Run a test purchase locally; confirm in dev console:
    [verify-payment] Meta CAPI event sent: { events_received: 2, ... }
[ ] In Events Manager Test Events: both "Purchase" and "<custom>" appear
[ ] EMQ shows 9+/10 on both events
[ ] event_source_url field is populated in the event preview

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
