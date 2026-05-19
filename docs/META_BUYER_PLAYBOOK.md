# Meta Ads Team — Post-CAPI-Upgrade Playbook

What to do in Meta Events Manager and Ads Manager after the engineering team ships the dual-event CAPI change (Purchase + sales, both with full EMQ fields + event_source_url).

Pixel: **Ankita pixel 2 (1364192652209120)** · Domain: **prenatal.bodyworx.in**

---

## Day 0 — verify the change landed (do this within 1 hour of deploy)

1. **Events Manager → Test Events tab**
   - Copy the test event code from the URL bar (e.g. `TEST12345`).
   - Hand it to engineering — they'll temporarily add it to the next CAPI call (or run a test purchase with `tgotest2025` coupon disabled).
   - Run one real ₹297 transaction through the live funnel.
   - In Test Events, you should see **two events arrive within 30 seconds**:
     - `Purchase` (server, EMQ should show 9+/10)
     - `sales` (server, EMQ should show 9+/10)
   - Each event card should show: `event_source_url: https://prenatal.bodyworx.in/...`, plus matching parameters: email, phone, name, city, country, fbc, fbp, IP, UA.

2. **Events Manager → Overview tab**
   - Confirm the `Purchase` row now shows **source: "Conversions API"** or "Server + Browser" (not just "Meta Pixel — Estimated").
   - Confirm `sales` row shows source: "Conversions API".

3. **Events Manager → Diagnostics tab**
   - The "Some Conversions API events will be blocked in 60 days" warning should disappear within ~72 hours of the first event firing with `event_source_url`. Don't panic if it lingers for 1-2 days — Meta updates diagnostics in batches.
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

WHY ARE THERE TWO EVENTS FIRING?
  Purchase = Meta's mature ML priors + iOS attribution + safety backup.
  sales    = internal source-of-truth label.
  Both fire on the same real Razorpay transaction.

WHERE'S THE MONEY NUMBER?
  Pabbly Google Sheet. Always.

WHO TO PING IF CPR DOUBLES?
  Engineering first (check CAPI is firing).
  Media buyer second (check creative/audience).
  Don't pause campaigns under 48h of confusion.
```
