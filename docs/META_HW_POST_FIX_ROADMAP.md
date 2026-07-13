# Post-Corrective-Fix Roadmap — What to Expect Over 30 Days (Meta H&W Restriction)

**Purpose:** after applying the custom-event-only corrective fix (Ankita prenatal + sibling funnels per `META_HEALTH_WELLNESS_RESTRICTION_SOP.md`), this doc sets honest expectations, gives a confidence score, and provides a **scenario playbook** so we know exactly what to do whatever Meta does next.

**Read this first — the single most important reframe:**

> **The warning/classification will almost certainly NOT go away. That is not the goal and not the definition of success.** Across 75+ audited accounts in the field, there is **no documented case** of a genuine health/wellness brand getting the category removed — because Meta assigns it by crawling your **domain content + ad creative**, not by reading your events. **Core Setup, once applied, is permanent at the domain level.** Our fix does not remove the flag; it **bypasses the *effect*** by sending Meta a clean custom event it won't block. **Success = the `sales` custom event keeps flowing and campaigns keep optimizing — with the warning still cosmetically present.**

---

## Honest confidence scores (0–10)

| Goal | Score | Why |
|---|---|---|
| **Custom `sales` event keeps flowing + campaigns optimize over 30 days** (the real goal) | **7 – 7.5** | Event is neutral-named, PHI-free, server-side, confirmed. Should survive the "standard events blocked" tier. Not higher because Meta is actively expanding enforcement and now *scans custom events*, and we keep the pixel + a health-y subdomain. |
| **The restriction warning disappears** | **1 – 2** | Classification is content-driven and effectively permanent. Do not expect it. |
| **Full pixel/domain block (Level 3) hits our India traffic within 30 days** | **2 – 3** (i.e. unlikely but possible) | No field reports of full blocks *despite* a clean fix; EU full-block is coming but our audience is India. |
| **A literal 100% guarantee (ours OR CustomerLabs')** | **0** | Impossible on the classified domain. See "The 100% question" below. |

**Net:** most likely outcome is a **working bypass with a permanent cosmetic warning** (Scenario B below). Plan for that; stay ready for C and D.

---

## The "100% guarantee" question (CustomerLabs vs our DIY fix)

CustomerLabs *markets* a guarantee. What their own Good Body Clinic case study actually shows: a **bypass** (recovery "under 24 hours," EMQ 7.2–8.7) — **the restriction did not disappear, they worked around it** — and **no long-term follow-up data**. Their guarantee is "our mechanism sends Meta clean events," not "Meta lifts your restriction." That mechanism is the *same one we built.*

**Feature-by-feature — are we as protected as CustomerLabs on the same domain?**

| Lever | CustomerLabs | Our DIY fix | Gap? |
|---|---|---|---|
| Standard events dropped | ✅ | ✅ | none |
| Custom event only, server-side CAPI | ✅ (`Pur_1`, `Add_1`…) | ✅ (`sales`) | name slightly less coded — low risk |
| Payload scrubbed (value/currency only) | ✅ | ✅ (value/currency/payment_id — `payment_id` is stripped by Core Setup anyway) | negligible |
| PII hashed SHA-256 | ✅ | ✅ | none |
| URL truncated to **root** domain | ✅ (`brand.com`) | ⚠️ host-only origin, **still `prenatal.bodyworx.in`** (subdomain carries `prenatal`, and lives under a classified root) | **real gap** |
| **Pixel removed entirely** | ✅ removes it | ❌ we keep pixel (PageView + MAM only) | **divergence** — see note |
| Clean **separate** domain for Level 3 | ✅ their durable play | ❌ not done (fallback only) | the durable lever neither of us has used yet |

**Honest read: our fix is ~85–90% of CustomerLabs' approach on the same domain.** The two real differences:
- **We keep the browser pixel** (only PageView + hashed MAM — no health context in our payload). CustomerLabs removes it because the pixel auto-scrapes page context. Our exposure here is small but nonzero.
- **Our host is `prenatal.bodyworx.in`** — the `prenatal` token + the classified root remain a residual signal. CustomerLabs truncates to root and, for hard cases, moves to a clean **separate** domain.

**The only thing approaching a durable guarantee — for anyone — is a genuinely clean, separate *root* domain Meta has never classified.** On the existing domain, we and CustomerLabs are both bypassing, not curing.

---

## 30-day timeline — what typically happens

- **Days 0–2:** clean custom event flows; if EMQ was depressed it can recover within ~24h (field reports + CustomerLabs both cite ~24h for match-quality recovery).
- **Days 0–7:** the "starting in 17 days" countdown either lapses quietly or converts to "applied." The **banner/flag usually persists**. Ad sets newly pointed at `sales` are in **learning** — don't judge CPR yet.
- **Days 7–14:** learning exits; CPR/ROAS should stabilize toward pre-restriction levels if the bypass is healthy.
- **Days 14–30:** steady state. Watch for the Scenario-C signals (custom event scanned/deprioritized). Lookalike/audience quality, if it dipped, recovers over ~4–8 weeks.

---

## Scenario playbook — be ready for all four

### Scenario A — Warning disappears after ~7 days
**Probability: ~10–15% (low).** Most likely it's the *countdown* resolving, not the *category* clearing.
- **Do:** nothing reactive. Confirm in Events Manager → Manage data source categories whether the *category* is actually gone (rare) or just the countdown banner. Keep the custom-only setup regardless — reverting to standard `Purchase` would re-trigger it.
- **Don't:** celebrate by re-adding `Purchase`.

### Scenario B — Warning stays, but nothing else gets restricted (custom `sales` keeps flowing) ✅ MOST LIKELY
**Probability: ~55–65%.** This is the win condition.
- **Do:** treat the banner as cosmetic. Report off the **Results column / `sales` count**, not the warning. Keep payload/creative clean. Document this as the new normal in the buyer playbook.
- **Watch:** weekly — `sales` count ≈ real transactions, EMQ ≥ 8, CPR stable.

### Scenario C — Warning stays AND the custom event gets scanned/deprioritized
**Probability: ~20–25%.** Signals: `sales` traffic quality drops ("bots/garbage CPM" — a real field report), CPM spikes, `sales` shows a "sensitive event" diagnostic, or server-side `sales` stops registering while browser shows it.
- **Do, in order:**
  1. **Verify server-side registration** in Test Events — a known gap is the custom event appearing browser-side but not as a *server* signal. Confirm our CAPI `sales` lands as "Server."
  2. **Make the event name more coded** — `sales` → `evt_a` / `cu_completed` (CustomerLabs uses `Pur_1`). Update `CHECKOUT_CONFIG.capi.eventName`, re-confirm in Events Manager, repoint the ad set.
  3. **Strip the payload to the bone** — drop `payment_id`, keep only `value` + `currency`.
  4. **Reconsider the kept pixel** — if scanning persists, gate the browser pixel to MAM-only or remove non-essential auto-collection.
  5. If still degrading → **escalate to Scenario D fix.**

### Scenario D — Full domain restriction (Level 3): even custom events blocked
**Probability: ~5–10% for India traffic near-term** (EU full-block is separate and expected, but our audience is India).
- **The only durable fix is a clean, SEPARATE root domain** Meta has never classified — **not** a `go.bodyworx.in` subdomain (field guidance says restrictions bind at the **root** domain, so same-root subdomains likely inherit it).
  - Stand up a neutral-brand root domain, host the funnel (or a thin clean entry surface) there, preserve `_fbp`/`_fbc`/UTM server-side, fire CAPI from the clean domain, point ads at the clean domain.
  - Move the dataset's allow-list / event source to the clean domain.
- **This is a project, not a toggle** (DNS, deploys, redirects, attribution continuity, full retest). Spin it up the moment Scenario-C mitigations stop holding — don't wait for a hard zero.

---

## Monitoring checklist (run weekly for 30 days)

- [ ] Events Manager → **Test Events**: `sales` arrives as **Server**, payload clean, EMQ ≥ 8, **no `Purchase`**.
- [ ] Events Manager → **Diagnostics**: no new "custom event blocked / sensitive" warning on `sales`.
- [ ] Events Manager → Overview: `sales` count ≈ real transaction count (no collapse).
- [ ] Ads Manager → ad set: optimizing on `sales`, out of learning, CPR/ROAS within tolerance.
- [ ] Manage data source categories: note any tier change (core setup → standard-events-blocked → full).
- [ ] Spot-check CPM/traffic quality on `sales`-optimized ad sets (Scenario-C early warning).

**Escalation trigger:** two consecutive weekly checks showing `sales` degradation (count collapse, EMQ < 7, sensitive-event flag, or quality crash) → execute Scenario C mitigations; if those fail within ~1 week → begin Scenario D clean-domain build.

---

## One correction to the earlier corrective plans

Earlier plans floated `go.bodyworx.in` / `bodyworx.in/p/...` as the clean-domain fallback. Field guidance indicates the classification binds at the **root** domain and **subdomains inherit it**. So the Level-3 fallback should be a **separate neutral root domain**, not another subdomain or path on the already-classified root. Update the escalation note in `META_HEALTH_WELLNESS_RESTRICTION_SOP.md` accordingly when we next touch it.

---

## Sources behind these estimates
- zappush — *Meta Pixel H&W Restrictions 2026: Myths vs Reality* (75+ accounts, Core Setup permanence, custom-event scanning, root-domain claim, conversion-rate 7%→0.5%, EMQ 5→8.5–9, 34% rejection spike Q1'26).
- CustomerLabs — *Good Body Clinic case study* (bypass via coded events + URL scrub + server-side; ~24h recovery; EMQ 7.2–8.7; no long-term data).
- Stape community thread *Data Restricted Health & Wellness Meta Ads* (custom-event server-registration gap; "bots/garbage CPM"; generic names pass, "lead"/"generate lead" blocked).
- Triple Whale, Penrod, Meta official data-source-category docs (tiers, appeal odds, Feb 2025 onset).

*All probabilities are expert judgment grounded in the above, not Meta-published figures. Revisit after the first 2 weekly checks and adjust.*
