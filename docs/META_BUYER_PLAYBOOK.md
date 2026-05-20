# Meta Ads Team — Post-CAPI-Upgrade Playbook

What to do in Meta Events Manager and Ads Manager after the engineering team ships:
1. The dual-event CAPI change (server `Purchase` + server `sales`, both with full EMQ fields + event_source_url)
2. The browser-side `Purchase` event paired with the server CAPI Purchase via matching `eventID` (for proper deduplication)
3. The "Track events automatically without code" toggle turned OFF in Events Manager

Pixel: **Ankita pixel 2 (1364192652209120)** · Domain: **prenatal.bodyworx.in**

---

## Day 0 — verify the change landed (do this within 1 hour of deploy)

1. **Events Manager → Test Events tab**
   - Copy the test event code from the URL bar (e.g. `TEST12345`).
   - Hand it to engineering — they'll temporarily add it to the next CAPI call (or run a test purchase with `tgotest2025` coupon disabled).
   - Run one real ₹297 transaction through the live funnel.
   - In Test Events, you should see **three rows arrive within 30 seconds**:
     - `Purchase` from **Browser (Pixel)** — EMQ 9+/10, with eventID populated
     - `Purchase` from **Server (Conversions API)** — EMQ 9+/10, with event_id matching the browser eventID, and `event_source_url: https://prenatal.bodyworx.in/...`
     - `sales` from **Server (Conversions API)** — EMQ 9+/10
   - The two `Purchase` rows should show a green **"Deduplicated"** badge or annotation, confirming Meta has matched them by event_id.
   - Each server event card should show matching parameters: email, phone, name, city, country, fbc, fbp, IP, UA.

2. **Events Manager → Overview tab**
   - Confirm the `Purchase` row shows **source: "Multiple"** (Meta Pixel + Conversions API) — that's correct now, and the deduplicated count is what gets reported.
   - Confirm `sales` row shows source: "Conversions API" only.
   - The Purchase count and the `sales` count should be **within 1–2 of each other** on any given day (small lag from dedup window). If they're materially different (e.g. 49 vs 16), see "When the numbers diverge" below.

3. **Events Manager → Diagnostics tab**
   - The "Some Conversions API events will be blocked in 60 days" warning should disappear within ~72 hours of the first event firing with `event_source_url`. Don't panic if it lingers for 1-2 days — Meta updates diagnostics in batches.
   - The "Fix price information for web Webinar/Purchase events" warning (if previously present) should age out as new events arrive with dynamic per-transaction value.
   - The "Improve event ID coverage / improve deduplication for this event" warning should drop from active errors within 72h once we have ≥75% dedup coverage. Tracking: Diagnostics → Purchase → "Event deduplication" tab → "Total event coverage rate" should climb from 0% toward 100%.
   - The "Confirm domain that belong to you" warning should remain cleared (you already added `prenatal.bodyworx.in` to allow list).

If anything in steps 1-3 fails, ping engineering before touching campaign settings.

---

## Day 0-7 — do NOT change campaign settings

Your campaign is already optimizing on **Purchase**. Don't touch it. What's happening under the hood:

- Meta is now receiving **high-quality Purchase events** (EMQ 9+) from CAPI alongside the previous low-quality URL-inferred Purchase events.
- Meta needs 48-72 hours to deduplicate and recalibrate its model with the cleaner signal.
- The algorithm will silently shift learning toward the higher-quality events.
- CPR may bounce slightly for 2-3 days as the algorithm adjusts — this is normal. Do not interpret early variance as a problem.

**Do not pause, edit, or duplicate ad sets during this window unless CPR rises >50% above baseline.**

---

## Day 7 — review and document the lift

By day 7, the cleaner signal should be fully baked in. Check:

| Metric | Where | Expected |
|---|---|---|
| Campaign Results (Purchase count) | Ads Manager → campaign → Results column | Same or higher than pre-change baseline |
| Cost per Result | Ads Manager → CPR column | **Lower than pre-change baseline** (typical drop: 15-35% for restricted categories) |
| EMQ for Purchase event | Events Manager → Purchase row | **9+/10** (was likely 3-5/10 before) |
| EMQ for sales event | Events Manager → sales row | **9+/10** |
| Match rate | Events Manager → Diagnostics → Event Match Quality | 85-95% (was ~40-60% with inferred events) |
| Purchase dedup coverage rate | Events Manager → Diagnostics → Purchase → Event deduplication | **≥75%** (was 0% before browser Purchase paired) |
| `Purchase` count ≈ `sales` count | Events Manager → Overview, daily | Within 1–2 events of each other. If `Purchase` is materially higher (e.g. 3× the `sales` count), browser Purchase isn't deduping — see "When the numbers diverge". |

Document the before/after CPR. This is the single biggest improvement you can make to ad performance on Meta — without changing creative or audience.

---

## Aggregated Event Measurement (AEM) for iOS — what changed (Oct 2024) and what's left to do

### Meta's October 2024 overhaul of AEM

Per Meta's current AEM documentation, the AEM configuration workflow for website conversion campaigns has been deprecated:

- **The 8-event priority cap is GONE.** No more "prioritize eight conversion events per domain."
- **The Aggregated Event Measurement tab has been removed from Events Manager.** There's no UI to configure.
- **Value sets are no longer required** to use Value Optimization.
- **Domain verification is no longer required for AEM event processing** (you may still need it for other Meta features).
- **No "conversion domain" selection** in Ads Manager campaign creation.
- **All eligible events are now processed through AEM automatically** — nothing to configure, nothing to maintain.

If your Events Manager has no "Web Events Configuration" or "Aggregated Event Measurement" section anymore, that's the new behavior. Not a bug. Not missing — Meta removed it.

### What still matters about iOS attribution (unchanged)

The configuration burden is gone, but the underlying iOS ATT environment is unchanged:

- iOS opt-outs are still ~75-80% of iOS users in India. Apple's tracking restrictions are unchanged.
- Default iOS attribution still shrinks to 1-day click windows (vs. 7-day on web) for opt-outs.
- **CAPI still bypasses ATT entirely.** Server-to-server traffic never enters Apple's tracking restrictions. This is why your funnel was built on CAPI in the first place, and AEM's UI removal doesn't change its value.

### Why we still fire `Purchase` alongside `sales`

The "AEM 8-event slot" reason no longer applies (no more slots to defend). But the other reasons still hold:

- **Standard `Purchase` benefits from Meta's mature global ML priors.** Meta's models have billions of `Purchase` events to learn from globally — custom event names like `sales` start cold with no semantic understanding.
- **Backup signal.** If `sales` gets disrupted (config error, future change), `Purchase` keeps reporting.
- **Same `event_id` provides dedup safety net** against any other source that may fire `Purchase` (URL inference, future code, etc.).

Firing both at zero marginal cost (single HTTP call, shared payload) is still the right call.

### What to do in Events Manager now

**Nothing.** AEM no longer requires configuration. If your account hasn't fully migrated and you still see the old "Web Events Configuration" / 8-slot priority UI:

1. Leave `Purchase` at position 1 (it's the auto-default).
2. Do NOT add `sales` to the list — no benefit, same-session rules would still apply.
3. Don't reshuffle anything (the old 72-hour cooldown still applies during the transition period).

Otherwise: this section is now purely informational. There's no recurring AEM hygiene task.

---

## "Track events automatically without code" toggle — turn this OFF

### What this toggle does (and why it's now redundant)

In Events Manager → dataset Settings → Event setup section, there's a toggle labeled **"Track events automatically without code."** When ON, Meta inspects every page on your site and infers events from URL patterns, button text, and page metadata — without any pixel code calling `fbq('track', ...)`.

Typical inferences:
- User lands on `/thank-you` → Meta infers a `Purchase` event
- User clicks a button containing "Submit" or "Register" → Meta infers `Lead`
- User on `/checkout` → Meta infers `InitiateCheckout`

This is exactly what was generating the "inferred Purchase" events you saw before CAPI was implemented. Now that the funnel fires Purchase from CAPI with full identity (event_id, hashed PII, fbc/fbp/IP/UA, event_source_url), the auto-detected events are **redundant with CAPI events but at much lower quality**.

### Why ON hurts data quality (post-CAPI)

| Behavior | Toggle ON | Toggle OFF |
|---|---|---|
| Purchase event count | Inflated (CAPI Purchase + auto-inferred Purchase, each `/thank-you` visit counts) | Clean (CAPI only) |
| Dedup against CAPI | Impossible — inferred event has no `event_id` | N/A |
| Average EMQ for Purchase | Drops — inferred events have EMQ 3-5/10, dragging your 9+/10 CAPI score down | Stays at 9+/10 |
| Algorithm optimization | Mixed signal — Meta learns from BOTH clean (CAPI) and dirty (inferred) Purchase events | Pure signal — only clean events feed the algorithm |
| False-positive Purchases | High — refresh `/thank-you`, hit back to `/thank-you`, refund landing all trigger inferred Purchase | None — only real verified Razorpay transactions count |
| Refund/chargeback record | Phantom purchases stay on file | Accurate |

### Recommendation: OFF

**Flip the toggle to OFF.** Three reasons stack up for this funnel:

1. **CAPI already provides authoritative Purchase events.** Auto-inferred Purchases are pure noise on top.
2. **Restricted category (prenatal/health) means data quality matters more than data quantity.** Clean 14 Purchases beats noisy 28 Purchases for Meta's optimization in regulated categories.
3. **Lost upper-funnel auto-events aren't worth the trade.** Meta inferring `ViewContent` on a Privacy Policy visit doesn't help any optimization — it just adds anonymous noise to your dataset.

The only scenario where ON makes sense: you don't have CAPI set up (we do), or you run a complex multi-page funnel with events you forgot to instrument (we don't).

### How to verify the change worked

After flipping OFF, watch Events Manager Overview for 3-7 days:
- The `Purchase` row should ONLY show "Conversions API" as the source (no more "Browser pixel — Estimated" or "Server + Browser").
- Total Purchase event count should match your real Razorpay transaction count (= Pabbly sheet count).
- EMQ for Purchase should rise (the low-quality inferred events were dragging it down).

---

## Reporting hierarchy — one rule for the whole team

Memorize this:

> **Campaign Results column = the campaign's optimization event count. That is the real conversion number. Don't add Purchase + sales together — they fire on the same transaction.**

| What number to use | Where to find it | When to cite it |
|---|---|---|
| Real campaign conversions | Ads Manager → campaign → **Results** column (Purchase count) | Daily ad performance, CPR, ROAS, client-facing reports |
| Internal cross-channel attribution | Events Manager → **sales** custom event row | Weekly review, comparing Meta vs other sources |
| Revenue source of truth | Pabbly Google Sheet | Finance, refunds, payouts, anything money-related |
| **AGGREGATE Events Manager count** | Events Manager → Overview total events | Diagnostics only — **never cite to anyone as conversions**. It's roughly 2x real because both Purchase and sales fire. |

If a stakeholder asks "why does Events Manager show 28 events when we only had 14 sales?" — answer: "Two events per conversion: standard Purchase for Meta's algorithm, custom sales for our internal naming. Campaign Results column shows the real 14."

---

## When to consider changing optimization event (rare)

Stay on `Purchase` optimization unless one of these happens:

1. You launch a second offer from the same pixel (e.g., free webinar) that also fires `Purchase`. Then switch THIS campaign to optimize on the custom event (`sales`) to isolate paid conversions from the free signups.
2. Meta's diagnostics flag that `Purchase` is being inferred from non-conversion URLs (false positives). Switch to `sales` then because it's strictly server-verified.
3. You hit 50+ `sales` events per ad set per week consistently AND want to A/B test optimization events. Run a split test (one ad set on Purchase, one on sales) for 14 days.

None of these apply today.

---

## Deduplication — what it is, why we set it up, what to expect

### The pattern (one paragraph)

For every real purchase, **two `Purchase` events arrive at Meta**: one from the browser pixel (fired client-side from the checkout success handler) and one from the Conversions API (fired server-side after Razorpay confirms payment). Both events carry the **same eventID** — the Razorpay payment ID. Meta sees the matching IDs within its 48-hour dedup window and collapses the two into a single counted Purchase. We get the resilience of CAPI (not blocked by ad blockers / iOS tracking prevention) **plus** the optimization signal of a browser-side standard event — without double-counting.

### Why we added this (history)

In the first version of the integration, only the server CAPI Purchase event fired. The browser pixel only fired PageView. This looked clean in theory but failed in practice: Meta's "Track events automatically without code" feature was synthesising its own Purchase events from page metadata (the `/thank-you` URL, the "Pay ₹297" button text, etc.). Those synthetic browser events had no eventID and could not be deduplicated against CAPI. Result: 16 real sales reported as 49 Purchase events.

Fix shipped:
1. Turned OFF "Track events automatically without code" (stops Meta from inferring).
2. Added an **explicit** browser `Purchase` event with `eventID = razorpay_payment_id` (gives Meta a clean dedup pair).

### When the numbers diverge (`Purchase` count >> `sales` count)

If you ever see Events Manager Overview showing the `Purchase` row at 2×, 3×, or more of the `sales` row, dedup is broken. In order of likelihood:

| Symptom | Likely cause | Fix |
|---|---|---|
| Purchase ≈ 3× sales, "Track events automatically without code" is ON | Meta is inferring phantom Purchase events with no eventID | Events Manager → Dataset settings → Event setup → toggle OFF |
| Purchase ≈ 2× sales, dedup coverage rate stuck at 0% | Browser eventID and server event_id don't match (typo, different field, or only one side firing) | Ping engineering — share a sample payment_id and ask them to confirm both events fire that exact string |
| Purchase only counts CAPI, dedup coverage 0%, sales accurate | Browser Purchase isn't firing at all (ad blocker, JS error before the call) | Test Events should show only the server row; ad-blocker browsers are expected to miss browser Purchase but CAPI still counts → expect ~75% coverage, not 100% |
| Purchase < sales | Server CAPI not firing for some orders (network failure, missing env var) | Check Vercel logs for `[verify-payment] Meta CAPI error:` — escalate to engineering |

A dedup coverage rate of **75–100%** is the healthy zone. 100% is unrealistic in practice because some users have ad blockers, NoScript, or iOS tracking prevention — those users send only the server CAPI event, which is exactly the failover we designed for.

### Will this break? (Other clients to watch)

The agency runs 100+ pixels. **Every pixel that has been live ~3+ weeks with steady traffic AND has "Track events automatically without code" still ON will eventually show the same divergence.** Don't wait for the warning — proactively check each client pixel's settings:
- Events Manager → Dataset settings → Event setup → "Track events automatically without code" → **OFF**.

If a client funnel is sending CAPI Purchase but doesn't have the browser-side Purchase pair yet (older repos), engineering should backfill the dedup helper using `AGENT_PROMPT_META_CAPI_ROLLOUT.md`. It's a 5-line code change in the checkout success handler.

---

## What to do if the diagnostic warning doesn't clear after 72 hours

1. Re-check Test Events tab — does the next Purchase event show `event_source_url` populated?
2. Re-check the URL value — must be on the allowlisted domain (`prenatal.bodyworx.in`), not the Vercel preview URL.
3. If both look correct, file a Meta Business Support ticket referencing the dataset ID and a sample `event_id`. Reference: [Conversions API restricted categories](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event).

---

## Quick reference card (laminate this, share in Slack)

```
WHICH EVENT TO OPTIMIZE ON?
  Always Purchase. Forever. For this funnel.

WHICH NUMBER IS REAL?
  Campaign Results column. Not Events Manager total.

WHY ARE THERE THREE ROWS FIRING IN TEST EVENTS?
  Server Purchase (CAPI) + Browser Purchase (Pixel) → DEDUPED to 1 Purchase.
  Server sales (CAPI, custom)                       → counted once.
  All three fire on the same real Razorpay transaction; same eventID on
  the two Purchases collapses them via Meta's 48h dedup.

WHY ARE PURCHASE & SALES TWO EVENTS, NOT ONE?
  Purchase = Meta's mature ML priors + iOS attribution + safety backup.
  sales    = internal source-of-truth label (custom name, server-only).
  Different event_name = no dedup between them = both stay countable separately.

WHEN PURCHASE COUNT >> SALES COUNT, CHECK:
  1. Events Manager → "Track events automatically without code" = OFF?
  2. Engineering: is browser fbq('track','Purchase', {...}, {eventID}) firing
     with the EXACT same string as the server event_id (= razorpay_payment_id)?
  See "When the numbers diverge" section above.

WHERE'S THE MONEY NUMBER?
  Pabbly Google Sheet. Always.

WHO TO PING IF CPR DOUBLES?
  Engineering first (check CAPI is firing + dedup coverage rate).
  Media buyer second (check creative/audience).
  Don't pause campaigns under 48h of confusion.
```
