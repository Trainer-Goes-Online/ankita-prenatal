# SOP — Preventive H&W Compliance for NEW Funnels (never get the restriction)

**Audience:** a fresh Claude Code agent (and the team) setting up a **brand-new client funnel + Meta pixel/dataset from scratch.** Run this BEFORE launch, while the data source is still clean and unclassified.

**Goal:** minimize the chance Meta ever classifies the new dataset into the **"Health and wellness condition"** category and applies a restriction — by controlling every classification signal we own, from day 0.

**Companion docs:** `META_HEALTH_WELLNESS_RESTRICTION_SOP.md` (corrective — for funnels already hit) and `META_HW_POST_FIX_ROADMAP.md` (what happens after a fix). This doc is the *upstream* version of both.

**Deliverable = a compliance audit + plan, not code.** Audit the new repo + planned setup against the checklist, report every gap, then write a plan and **wait for human approval before editing.** No direct code changes on the first pass.

---

## ⚠️ Read first — the honest truth about "100%"

There is **no literal 100% guarantee** on a domain whose offer is genuinely health/wellness — and any vendor (CustomerLabs included) claiming one is describing a *bypass mechanism*, not immunity from classification. Here's why, and what we can actually promise:

- Meta classifies a dataset by crawling **domain content, landing pages, AND ad creative** — not just events. If the *offer itself* reads as a health condition (prenatal, postpartum, PCOS, pelvic floor, fertility, weight loss), Meta can classify it from the page/creative **even with perfect event hygiene.**
- **What we CAN drive to near-zero:** every signal *we control* — domain/subdomain naming, event names, payloads, URLs, pixel behavior, page metadata, and creative language.
- **The residual we can't fully remove:** the inherent health nature of the offer. We mitigate it with a **neutral domain + lifestyle-framed positioning**, but we state plainly to the client that classification is possible and we have a corrective plan ready if it happens.

**Realistic promise: "We remove 100% of the controllable signals and frame the offer as lifestyle/fitness, which drops classification risk to its practical floor — and if Meta still classifies, the corrective SOP keeps conversions flowing."** That is the honest version of the guarantee. Build the SOP to hit that floor.

---

## The prevention model — Meta classifies on 6 surfaces; clean all 6

| # | Surface Meta reads | Preventive principle |
|---|---|---|
| 1 | **Domain / subdomain** | Neutral, lifestyle/brand name. No condition words. Own root per client. |
| 2 | **Landing page content + metadata** | Lifestyle/fitness framing; condition terms minimized and below-the-fold. |
| 3 | **Ad creative + copy** | No symptom/condition language, no before/after, comply with H&W *ad* policy. |
| 4 | **Event names** | Neutral/coded from day 0. Never standard `Purchase`/`Lead`; never `generate_lead`. |
| 5 | **Event payload (`custom_data`)** | `value`/`currency`/`order_id` only. No `content_name`, product, condition, UTMs/fbclid to Meta. |
| 6 | **`event_source_url`** | Root/host-only. No health-y path/query reaches Meta. |

If all six are clean from launch, the only remaining classification input is the offer's intrinsic nature — handled by surfaces 1–3 (positioning).

---

## Step 0 — Confirm this funnel needs the preventive protocol

Apply this SOP when the new offer touches **any** health/wellness/condition theme: pregnancy, prenatal, postpartum, fertility, pelvic floor, weight loss, hormones, PCOS, menopause, pain, recovery, supplements, mental health, sexual/reproductive health, medical/clinical services.

If the offer is genuinely unrelated to health (e.g. a business course, generic fitness-for-aesthetics with no condition framing), the standard `META_TRACKING_AGENT_GUIDE.md` dual-event pattern is fine — note it and stop.

---

## Step 1 — Domain & positioning strategy (highest leverage; decide before code)

This is the single biggest lever, because classification is content-driven and **permanent at the root-domain level** once applied.

- [ ] **Neutral root domain per client.** No condition words in the domain or subdomain. `prenatal.bodyworx.in` is exactly what to avoid — `bodyworx.in` or a fresh brand root is better; a generic `go.<brand>` style entry surface is better still.
- [ ] **One root domain per client/offer** — don't stack multiple health funnels under one root (classification can bind at the root and tar sibling subdomains).
- [ ] **Lifestyle / outcome framing, not condition framing.** "5-day reset for new moms" beats "postpartum diastasis recti recovery." Position as fitness/wellbeing/coaching.
- [ ] If a health term is unavoidable in the brand, keep it out of the **domain** and out of **page titles/H1/meta**.

---

## Step 2 — Audit the new repo against the clean-build target (read-only)

The new funnel should be built to mirror the *corrected* `ankita-prenatal` posture from day 0 (custom-only), NOT the old dual-event default. Locate/confirm, with file paths:

**Server CAPI route** (`app/api/.../verify*/route.ts`):
- [ ] Fires **only a neutral custom event** (e.g. `sales`/`evt_a`) — **no standard `Purchase`** in the `events` array.
- [ ] `custom_data` = `value`, `currency`, `order_id` only. **No** `content_name`, product name, category, condition term, UTM, or `fbclid`.
- [ ] `event_source_url` reduced to **origin/root** server-side (`new URL(u).origin`), not the full client URL.
- [ ] Full hashed `user_data` + `external_id` present (EMQ) — these are fine, PII is hashed.
- [ ] Free/test order guard skips CAPI.

**Client pixel** (`app/layout.tsx`):
- [ ] Fires **only** `PageView` + cookie-aware MAM (hashed). No standard conversion events browser-side.
- [ ] No `content_name`/product strings in any browser event.

**Analytics module** (`lib/analytics.ts`):
- [ ] **No** browser-side `Purchase`/`trackPurchasePixel` helper. MAM helpers only.

**Any downstream/automation events** (e.g. Apps Script, CRM webhooks → Meta):
- [ ] Custom event names only; payload clean (`order_id`, not `payment_id`; no UTM/fbclid to Meta); origin-only URL.

**Landing pages** (`app/page.tsx`, section components, metadata):
- [ ] `<title>`, meta description, H1, and any schema.org markup are **lifestyle-framed**; condition terms minimized and not in the prominent metadata.

**Grep** for standard event names anywhere: `Purchase`, `Lead`, `InitiateCheckout`, `AddToCart`, `ViewContent`, `Subscribe`, `Schedule`, `Contact`, `CompleteRegistration`. Any presence = a gap to fix.

---

## Step 3 — Meta setup audit (ask the human / plan the setup)

- [ ] **Self-categorize proactively at setup** to the most accurate **non-restricted** category before Meta auto-classifies (Events Manager → Manage data source categories). Meta can still override, but starting clean helps.
- [ ] Plan to **optimize on the custom event from day 1** — never stand up the campaign on standard `Purchase`. (No standard-event priors to lose if you never depend on them.)
- [ ] **Auto-tracking ("Track events automatically without code") OFF** and **Automatic Advanced Matching OFF** — both let Meta infer events/context from page content, which feeds classification.
- [ ] **Allow-list only the production domain** (no staging/preview URLs).
- [ ] Decide **Core Setup posture knowingly**: once on it's irreversible — but since we pre-strip custom params + URL path, it costs us nothing if it lands.

---

## Step 4 — The clean-build target (what the plan should produce)

For a health/wellness new funnel, the launch state is the corrected posture, established up front:

1. **Custom event only**, server-side CAPI — neutral name (`sales`, or coded `evt_a` for maximum safety).
2. **No browser-side standard events** — pixel fires only `PageView` + hashed MAM.
3. **Payload = `value`/`currency`/`order_id`** — nothing descriptive.
4. **`event_source_url` = origin/root only.**
5. **Neutral domain + lifestyle-framed landing pages + clean metadata.**
6. **Creative compliant** with Meta's H&W ad policy (no before/after weight-loss, no body-shaming, reproductive-health ads target 18+, no symptom-targeting copy).
7. **Meta UI:** self-categorized non-restricted, auto-events OFF, AAM OFF, optimize on the custom event, production domain only.

Keep untouched/standard: full hashed `user_data` + `external_id` (EMQ stays 9+), free-order guard, server-as-price-authority.

---

## Step 5 — Pre-launch GO / NO-GO gate

Do not start spend until every box is green. One red = NO-GO until fixed.

- [ ] Domain/subdomain carries **no** condition word.
- [ ] Landing title/meta/H1 lifestyle-framed; condition terms minimized.
- [ ] Ad creative + copy compliant (no symptom/before-after/body-shaming language).
- [ ] CAPI fires **custom event only**; **no** standard `Purchase` anywhere (browser or server).
- [ ] Payload clean (`value`/`currency`/`order_id`); no `content_name`/product/UTM/fbclid to Meta.
- [ ] `event_source_url` origin/root only.
- [ ] Pixel fires only `PageView` + hashed MAM.
- [ ] Meta: self-categorized non-restricted, auto-events OFF, AAM OFF, optimize on custom event, prod domain only.
- [ ] Test Events: custom event arrives as **Server**, EMQ ≥ 8, payload clean, no `Purchase`.

---

## Step 6 — Ongoing hygiene (so it stays clean)

- [ ] Never add a standard event "for priors" later — it re-opens the exact risk this SOP closes.
- [ ] Never add `content_name`/product/condition strings to payloads in future iterations.
- [ ] New landing pages / new creatives go through the Step-5 gate before they ship.
- [ ] Monthly: glance at Events Manager → Manage data source categories for any new flag; if one appears, switch to `META_HEALTH_WELLNESS_RESTRICTION_SOP.md` (corrective) immediately.

---

## Step 7 — Write the plan and STOP for approval

Produce a plan with: (1) offer/health-theme assessment (Step 0), (2) domain + positioning recommendation (Step 1), (3) repo compliance gaps vs the clean-build target (Step 2), (4) Meta-setup actions (Step 3), (5) the GO/NO-GO checklist status (Step 5), (6) an explicit **honest risk statement** to the client (what we control vs the residual offer-nature risk, and that the corrective SOP is the safety net). **Wait for approval before editing code.**

---

## Why this can't be a literal 100% — say it to the client plainly

We remove **every controllable classification signal** and frame the offer as lifestyle/fitness. The only thing left is the **intrinsic health nature of the product**, which Meta can read from the page/creative regardless of our event hygiene. So the honest promise is: *"near-zero controllable risk, plus a proven corrective playbook if Meta classifies anyway."* Anyone promising more than that — including third-party tools — is selling the bypass mechanism we already build in-house, not actual immunity.

**Reference:** corrected `ankita-prenatal` (`route.ts` custom-only + origin URL; `lib/analytics.ts` no browser Purchase; `docs/META_TRACKING_AGENT_GUIDE.md` Section 0). Field basis for the "controllable vs intrinsic" split: zappush 2026 myths-vs-reality (classification = domain/creative crawl, Core Setup permanent at root), CustomerLabs Good Body Clinic case study (bypass, not removal), Stape community reports (custom events can be scanned/deprioritized).
