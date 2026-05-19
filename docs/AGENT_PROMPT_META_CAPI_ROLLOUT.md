# Drop-in prompt for Claude Code agent — rolling out the Meta CAPI pattern

Copy-paste the block below into a Claude Code session (or any Claude-driven coding agent) in a sibling project, alongside the `META_CAPI_OPTIMIZATION_GUIDE.md` file. The agent will read the guide, audit the existing codebase, implement the pattern, and produce a structured diff summary you can verify against the reference.

---

## The prompt

```
I'm sharing a documentation file (META_CAPI_OPTIMIZATION_GUIDE.md) that describes the EXACT Meta Conversions API integration pattern I want implemented in this codebase. This pattern is already live and working in a sibling project (the BodyWorx Prenatal funnel). Your job is to replicate it here, adjusted for whatever form fields, payment provider, and custom event naming this project actually uses.

STEP 1 — Read the guide
Read META_CAPI_OPTIMIZATION_GUIDE.md end to end before touching any code. Pay special attention to:
- The exact event payload structure (Purchase + custom event in one HTTP call)
- The 6 hashed user_data fields and their normalization rules
- The event_source_url requirement
- The "anti-patterns to avoid" table

STEP 2 — Audit the existing codebase
Find and report on:
1. The server route that handles successful payment verification (and is the right place to fire CAPI events)
2. What form fields the checkout flow currently collects (email, phone, names, address, etc.)
3. What payment provider the project uses, and what transaction ID format it issues
4. The current state of Meta integration — is there existing CAPI code? Existing browser pixel events? Existing `fbq('track', ...)` calls?
5. Whether NEXT_PUBLIC_/server env var separation is correctly set up for META_PIXEL_ID and META_CAPI_ACCESS_TOKEN
6. Whether there's a "free / test / QA" code path that should skip CAPI firing

Report what you found in 5-10 bullet points before making any changes.

STEP 3 — Propose the changes
Based on your audit, propose specifically:
- Which file(s) you'll edit
- What custom event name to use (default: `sales` for paid product, `leads` for lead-gen — match the project's terminology)
- How to thread `event_source_url` from client to server given this project's stack
- Whether any existing CAPI code needs to be replaced or extended

Wait for my approval before editing.

STEP 4 — Implement
Once I approve, implement the changes following the guide EXACTLY. Specifically:
- Fire BOTH `Purchase` (standard) AND the custom event in a single HTTP POST to Meta with a 2-element `data` array
- Both events share `event_id`, `event_source_url`, `user_data`, `custom_data`
- All 6 hashed user_data fields (em, ph, fn, ln, ct, country) using the normalization rules in the guide
- 4 server-context fields (fbc, fbp, client_ip_address, client_user_agent) sent RAW (unhashed)
- Client sends `window.location.href` as `eventSourceUrl` in the verify-payment POST body
- Server uses request body's eventSourceUrl, falls back to a hardcoded production URL
- CAPI block is guarded by the equivalent of `!isFreeOrder`
- Client-side pixel fires ONLY `PageView` — remove any `fbq('track', 'Purchase'|'InitiateCheckout'|...)` calls if they exist

STEP 5 — Verify and report
After implementation:
1. Run the project's type-checker / linter and confirm it passes
2. Output a final summary in this EXACT format so I can verify against the reference implementation:

## Changes made

### File 1: <path to verify-payment route>
- <bullet list of specific changes>

### File 2: <path to client checkout form>
- <bullet list of specific changes>

### File 3: <path to root layout, if applicable>
- <bullet list>

### File 4: <path to env example, if applicable>
- <bullet list>

## Verification checklist for the user

[ ] Type-check / lint passes
[ ] Run a test purchase locally; confirm in dev console: events array sent with 2 entries
[ ] In Events Manager Test Events: both "Purchase" and "<custom_event_name>" appear
[ ] EMQ shows 9+/10 on both events
[ ] event_source_url field is populated in the event preview
[ ] No more "event_source_url missing" diagnostic warning after 72h
[ ] Free/test orders do NOT fire CAPI events

## Notes / decisions
<List any project-specific deviations from the standard pattern, including:
 - Form fields the project does NOT collect (and thus user_data fields you had to omit)
 - Custom event name chosen and why
 - Any other deviations>

## Side-by-side comparison with the reference implementation

| Aspect | Reference (BodyWorx Prenatal) | This project |
|---|---|---|
| Server route path | app/api/razorpay/verify-payment/route.ts | <path> |
| Client form path | components/CheckoutForm.tsx | <path> |
| Payment provider | Razorpay | <provider> |
| Transaction ID source | Razorpay payment_id | <source> |
| Custom event name | sales | <name> |
| Hashed PII fields sent | em, ph, fn, ln, ct, country | <fields> |
| Server-context fields | fbc, fbp, IP, UA | <fields> |
| event_source_url source | window.location.href from client | <source> |
| Free-order guard | !isFreeOrder | <guard> |
| Client pixel events | PageView only | <events> |

STEP 6 — Double-check
Before declaring done, re-read your final summary and confirm:
1. The payload structure matches the guide's JSON example exactly (right field names, right hashing, right normalization)
2. event_source_url is present in BOTH events in the data array
3. Both events have the same event_id
4. user_data is identical between the two events
5. The custom event name is consistent in the codebase config (not a magic string scattered across files)

If anything in your summary doesn't match the guide, flag it explicitly under "Notes / decisions" as a deliberate deviation. Don't silently deviate from the pattern.

Show me the full summary at the end. I will manually compare it against the reference implementation in the BodyWorx Prenatal repo.
```

---

## How to use this prompt

1. Open the sibling project in Cursor / Claude Code.
2. Drop both files into the project root or `docs/` folder:
   - `META_CAPI_OPTIMIZATION_GUIDE.md` (the reference pattern)
   - `AGENT_PROMPT_META_CAPI_ROLLOUT.md` (this file — contains the prompt above)
3. In a new Claude Code session, paste the prompt block above (the part inside the ``` ``` fence).
4. The agent will audit → propose → wait for your approval → implement → output a structured summary.
5. Compare its final "Side-by-side comparison" table against the BodyWorx Prenatal reference. Anything that doesn't match should be a deliberate, explained deviation — not a silent shortcut.

## What this guarantees

- Pattern consistency across every client funnel
- The agent surfaces deviations explicitly instead of hiding them
- The verification checklist matches what your media buyer team can confirm in Meta Events Manager
- The side-by-side table makes manual review take 60 seconds instead of 60 minutes
