# Drop-in prompt for Claude Code agent — rolling out Manual Advanced Matching (MAM)

Copy-paste the block below into a Claude Code session in any sibling project to replicate the MAM pattern shipped in this repo (Trainer-Goes-Online/ankita-prenatal). The agent will audit the codebase, propose changes, implement, and produce a forced side-by-side comparison table for manual verification.

This prompt is self-contained — the agent does not need any other files. Optionally pair it with `META_CAPI_OPTIMIZATION_GUIDE.md` if the sibling project also needs the server-side CAPI work.

---

## The prompt

```
Implement Manual Advanced Matching (MAM) for the Meta Pixel in this project, matching the pattern I already shipped in the BodyWorx Prenatal repo. This clears the "Set up manual advanced matching" diagnostic in Events Manager and gives browser-side pixel events hashed user identity (for retargeting audiences and cross-device attribution).

WHAT MAM IS:
A second `fbq('init', PIXEL_ID, matchingObject)` call passing the buyer's identity. Meta's pixel library SHA-256 hashes the values client-side before transmission - raw PII never leaves the browser. All subsequent pixel events (including Meta's auto-PageView on SPA route changes) inherit the matching signals.

STEP 1 - AUDIT (report findings before editing)
Find and tell me:
- Where the Meta Pixel is initialized (root layout, likely a Script tag firing `fbq('init', PIXEL_ID)` + `fbq('track', 'PageView')`)
- Where the form data is captured (checkout form / lead form component)
- Where each success redirect happens (paid path, free/coupon path, lead-submit path - all of them)
- The pixel ID value (literal string in the layout)

STEP 2 - ADD HELPER in your project's analytics module (conventionally `lib/analytics.ts`)
Function: `setMetaAdvancedMatching(data)` accepting optional: email, phone (any format), firstName, lastName, city, country (2-letter ISO).
Normalization (Meta spec - apply in the helper):
  em      -> email.trim().toLowerCase()
  ph      -> phone.replace(/\D/g, '')             // digits only, no +/dashes/spaces
  fn      -> firstName.trim().toLowerCase()
  ln      -> lastName.trim().toLowerCase()
  ct      -> city.trim().toLowerCase().replace(/[^a-z]/g, '')   // strip ALL non a-z, no spaces
  country -> country.trim().toLowerCase()         // 2-letter ISO
Only include keys with non-empty normalized values.
Guard with `if (typeof window === 'undefined' || !window.fbq) return;`
Call `window.fbq('init', PIXEL_ID, matchingObject)` passing RAW NORMALIZED values - DO NOT hash yourself. The pixel library hashes them.

STEP 3 - CALL THE HELPER right before EVERY redirect to the success page
In each form-submit success path (paid + free/coupon + any other), call `setMetaAdvancedMatching({...form fields...})` IMMEDIATELY BEFORE the `router.push` (or `window.location.assign`) to the thank-you/success page. Not on the success page itself - Meta's auto-PageView for the new URL fires immediately on route change, so MAM must be set BEFORE the redirect.

STEP 4 - TYPE-CHECK, THEN OUTPUT THIS SIDE-BY-SIDE FOR ME TO VERIFY

| Aspect                          | Reference (Prenatal repo)                          | This project |
|---------------------------------|----------------------------------------------------|--------------|
| Helper location                 | lib/analytics.ts                                   | ?            |
| Helper name                     | setMetaAdvancedMatching                            | ?            |
| Pixel ID source                 | Literal mirroring the root layout init             | ?            |
| Called from                     | All form-submit success paths                      | ?            |
| Called WHERE in each path       | Immediately before router.push to success page     | ?            |
| Form fields -> MAM keys         | email->em, phone(+dial)->ph, firstName->fn,        | ?            |
|                                 | lastName->ln, city->ct, country->country           |              |
| Phone normalization             | digits-only (strip +, dashes, spaces)              | ?            |
| City normalization              | lowercase, a-z only (no spaces/punctuation)        | ?            |
| Country normalization           | lowercase 2-letter ISO                             | ?            |
| Hashing                         | Done by Meta pixel - NOT in our code               | ?            |
| Type-check / lint               | Passes                                             | ?            |

ANTI-PATTERNS TO AVOID
- Don't hash values yourself before passing to fbq - Meta hashes them
- Don't call MAM init from the success page itself - too late
- Don't store PII in sessionStorage/localStorage to "carry it across" - set MAM before redirect, no storage needed
- Don't skip normalization - ct in particular MUST strip spaces and punctuation
- Don't use a different pixel ID than what's already in the layout init
- Don't call MAM unconditionally on app load - only after the form is submitted and we know identity

REFERENCE COMMIT FOR DIFFING
The exact pattern lives in commit eb59d50 of Trainer-Goes-Online/ankita-prenatal - files lib/analytics.ts (helper) and components/CheckoutForm.tsx (call sites). Match this implementation. Flag any deliberate deviation in your output under a "Notes / decisions" section.

Show me the side-by-side table at the end. I will manually verify against the reference.
```

---

## How to use

1. Open the sibling project in Cursor / Claude Code.
2. Optionally copy this file into that project's `docs/` folder so it's discoverable later.
3. In a new Claude Code session, paste the prompt block above (the part inside the triple backticks).
4. The agent will audit → report → wait for your approval → implement → output the forced side-by-side table.
5. Manually compare against `lib/analytics.ts` and `components/CheckoutForm.tsx` from this repo at commit `eb59d50`. Any "?" cell left unfilled, or any deviation not flagged under "Notes / decisions", is a yellow flag worth a follow-up question.

## Pairs naturally with

- `META_CAPI_OPTIMIZATION_GUIDE.md` + `AGENT_PROMPT_META_CAPI_ROLLOUT.md` (server-side CAPI dual-event firing). Roll out CAPI first, then MAM — same order this repo went through. MAM has limited value without CAPI behind it because the conversion event matching happens server-side.
- `META_BUYER_PLAYBOOK.md` for the media buyer team's post-deploy verification steps.
