# SOP — Fixing Meta's Health & Wellness Data-Sharing Restriction (per-funnel)

**Audience:** a fresh Claude Code agent working inside a sibling funnel repo (Next.js + custom Meta CAPI, same family as `ankita-prenatal`).
**Scope:** this SOP applies **ONLY to funnels whose Meta pixel/dataset has actually been hit by the "Health and wellness condition" data-source-category restriction.** If the restriction is not present (Step 0 below comes back negative), **stop — do not apply any of this.** Non-restricted funnels keep the standard dual-event pattern documented in `META_TRACKING_AGENT_GUIDE.md`.

**Your deliverable is a PLAN, not code.** Audit the repo and the Meta setup, confirm the restriction applies, then write a plan of the exact changes you'll make and **wait for the human to approve it before editing anything.** No direct code changes on the first pass.

---

## Step 0 — Confirm the restriction actually applies (GATE — do this first)

Ask the human to confirm (or report screenshots from) the following in **Meta Events Manager → the funnel's dataset → Overview / Settings**:

1. A banner like *"Additional restrictions on data sharing starting soon"* / *"core setup applied"*, **or**
2. **Settings → Manage data source categories** shows the dataset flagged under **"Health and wellness condition"** (or another restricted health category), **or**
3. A category-review **rejection** notice, **or**
4. Diagnostics / email warning that *"certain standard events will be blocked"* in non-EU regions and/or *"all data sharing may be blocked"* in the EU region.

**If none of these are present → STOP.** Tell the human this funnel is not under the restriction and no changes are needed. Point them to `META_TRACKING_AGENT_GUIDE.md` for the standard pattern.

**If confirmed → continue.** Record exactly what's shown: which category, "core setup" yes/no, the enforcement clock (e.g. "17 days"), and whether an appeal was already filed/rejected.

---

## Step 1 — Understand the restriction (background, so your plan is grounded)

- Meta categorizes datasets by topic. **Health & Wellness** is a restricted category. A pregnancy/prenatal/postpartum/fertility/symptom/condition funnel falls into it — and a **health-y subdomain** (e.g. `prenatal.`) is itself a signal Meta reads.
- Restriction tiers, applied progressively:
  - **Core setup** — Meta strips the **URL path/query after the domain** and **custom parameters**. (Usually applied first.)
  - **Restricted standard events** — blocks mid/lower-funnel **standard events by name**: `Purchase`, `AddToCart`, `InitiateCheckout`, `Subscribe`, `Lead`. (Non-EU.)
  - **Full restriction** — all events blocked in a region (EU). Moot for India-targeted funnels.
- **The lever:** the restriction targets **standard events by name**. **Confirmed custom events with PHI-free payloads are NOT in that bucket** and keep flowing + optimizing.
- **A Custom Conversion is NOT required and gives no bypass advantage** — a raw custom event and a Custom Conversion built on it are the same "custom" data. Optimize the campaign **directly on the custom event**.
- **Appeals usually fail** for a genuine health funnel (30-day lockout between requests). Don't build the plan around an appeal.
- **Third-party tools (CustomerLabs / Stape) are unnecessary here** — they automate rename + payload-scrub + first-party cookies for non-engineers. These repos already do all three by hand. Don't propose adopting them.

---

## Step 2 — Audit the repo (read-only; report findings)

This funnel should mirror `ankita-prenatal`. Locate and quote, with file paths + line numbers:

**Server CAPI route** (e.g. `app/api/.../verify-payment/route.ts`):
- [ ] The `sendMetaCapiEvent` (or equivalent) function and the **`events` array** — does it fire a standard **`Purchase`** alongside the custom event? Quote the array.
- [ ] The **custom event name** and where it's configured (e.g. `CHECKOUT_CONFIG.capi.eventName` = `sales`/`leads`/`signup`).
- [ ] The **`custom_data`** payload — does it contain only neutral fields (`value`/`currency`/`payment_id`) or any health-y strings (`content_name`, product names, category)?
- [ ] How **`event_source_url`** is built — full client URL or host-only? Does the fallback hardcode a health-y path?
- [ ] The **free/test/coupon guard** that skips CAPI (so QA orders don't report).

**Client pixel** (e.g. `app/layout.tsx`):
- [ ] `fbq('init')`, the `bw_mam` cookie-aware Advanced Matching, and `fbq('track','PageView')`. (These STAY — PageView is upper-funnel, not restricted.)

**Analytics module** (e.g. `lib/analytics.ts`):
- [ ] Any browser-side **`Purchase`** helper (e.g. `trackPurchasePixel`) and whether it sends a health-y `content_name`. Note all call sites.
- [ ] MAM helpers (`setMetaAdvancedMatching`, `reapplyMamFromCookie`). (These STAY.)

**Form / success page** (e.g. `components/CheckoutForm.tsx`, `app/thank-you/page.tsx`):
- [ ] Where the browser `Purchase` helper is **called** (if at all). Note imports to clean up.

**Grep broadly** for any other Meta event names: `Purchase`, `Lead`, `InitiateCheckout`, `AddToCart`, `ViewContent`, `Subscribe`, `CompleteRegistration`.

---

## Step 3 — Audit the Meta side (ask the human / report)

- [ ] Is the **custom event** (e.g. `sales`) already being **received** in Events Manager, and is it **confirmed** (not in "needs review / blocked" state)? Under restrictions, custom events are auto-blocked until reviewed/confirmed.
- [ ] What does the **campaign / ad set currently optimize on**? (Almost certainly the standard `Purchase`.)
- [ ] Capture current Diagnostics warnings for a before/after comparison.

---

## Step 4 — The target end state (what your plan should produce)

Mirror the reference fix already shipped in `ankita-prenatal` (commit history + `META_TRACKING_AGENT_GUIDE.md` Section 0):

**Code:**
1. **Server CAPI fires ONLY the custom event** — remove the `{ event_name: 'Purchase' }` entry from the `events` array; the `data` array carries a single custom event.
2. **Remove the browser-side `Purchase`** entirely (the helper + all call sites + unused imports). This also removes any health-y `content_name` it carried. Replace the helper body with a NOTE explaining why there's intentionally no browser Purchase (and that any future browser pair must be the *custom* event, never `Purchase`).
3. **`event_source_url` → host-only origin** (e.g. `new URL(eventSourceUrl).origin`, with a host-only fallback). Core setup strips the path anyway; this avoids leaking UTMs/health-y path segments.
4. **Keep untouched:** browser `PageView` + Advanced Matching (MAM), the full 11-signal `user_data` + `external_id` on the custom event (EMQ stays high), the free-order guard, and all price/amount logic (server stays the price authority).
5. **Keep the custom_data PHI-free** — never add `content_name`/product/category strings with health terms (the funnel's condition words, "pain", "labor", etc.).

**Meta platform (human/media-buyer actions — list them, don't attempt them):**
6. Confirm the custom event in Events Manager (if not already).
7. **Switch campaign/ad-set optimization from `Purchase` → the custom event directly** (no Custom Conversion). Flag that this **re-enters the learning phase** — time it away from peak spend, judge after ~7 days.

**Docs (if this repo carries copies of the guide/playbook):**
8. Add/point to the Health & Wellness override so the dual-event guidance is correctly inverted for this funnel.

**Escalation (only if needed — put in the plan as a fallback, not the first move):**
9. If Meta later **filters the custom event itself** because the **subdomain** is the residual health signal: move the funnel to a **neutral host** (e.g. `go.<brand>` or `<brand>/p/...`), preserve `_fbp`/`_fbc`/UTM server-side, fire CAPI from the neutral domain. Heavy (DNS, redirects, attribution continuity, full retest) — fallback only.

---

## Step 5 — Write the plan and STOP for approval

Produce a plan with these sections, then **wait for the human to approve before any edits:**

1. **Restriction confirmation** — exactly what Step 0 showed (category, tier, clock, appeal status).
2. **Current state** — repo audit findings (event names + where fired) and Meta-side findings (custom event status, current optimization target).
3. **Code changes** — the specific files/functions to edit, mapped to Step 4 items 1-5, with before/after intent (not full diffs).
4. **Meta-platform actions** — items 6-7, written as a checklist for the media buyer.
5. **Verification plan** — how to confirm it worked (Step 6 below).
6. **Escalation note** — item 9 as the documented fallback.
7. **Open questions** — anything ambiguous in this funnel that differs from the reference repo.

Keep it concise and scannable. Do **not** edit code until approved.

---

## Step 6 — Verification (include in the plan; run after approval + deploy)

1. **Events Manager → Test Events** (with test event code): walk the funnel with a **real paid transaction** (note: free/QA coupons skip CAPI via the guard, so they will NOT validate CAPI). Confirm **only the custom event** arrives server-side — **no `Purchase`** from browser or server.
2. **Diagnostics:** no "custom event blocked / sensitive" warning on the custom event.
3. **Ads Manager:** ad set now optimizes on the custom event and is delivering (expect a short learning phase).
4. **Match quality:** custom event EMQ stays high (user_data unchanged).
5. **Reporting:** Results column reads ≈ real conversions (no 2× browser-Purchase inflation).
6. **Local:** project type-check passes; walk landing → checkout → thank-you in dev.

---

## Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Confirm the restriction (Step 0) before anything | Apply this SOP to a funnel that isn't restricted |
| Fire the custom event only, server-side | Keep firing the standard `Purchase` (browser or server) |
| Optimize directly on the custom event | Build a Custom Conversion expecting it to bypass the restriction |
| Keep PageView + MAM + EMQ payload intact | Remove the pixel or Advanced Matching |
| Keep custom_data neutral (value/currency/id) | Add health-y `content_name`/product strings |
| Treat clean-domain move as a fallback | Rebuild on a new domain before trying custom-only |
| Plan first, wait for approval | Edit code on the first pass |
| — | Buy CustomerLabs/Stape (redundant here) or bank on an appeal |

**Reference implementation:** `Trainer-Goes-Online/ankita-prenatal` — see its `app/api/razorpay/verify-payment/route.ts` (custom-only `events` array, host-only `event_source_url`), `lib/analytics.ts` (no browser Purchase), `components/CheckoutForm.tsx` (no `trackPurchasePixel` call), and `docs/META_TRACKING_AGENT_GUIDE.md` Section 0 / `docs/META_BUYER_PLAYBOOK.md` Section 0.
