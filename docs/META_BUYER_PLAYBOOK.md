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

## Aggregated Event Measurement (AEM) for iOS — confirm setup

iOS users (likely 60-70% of your prenatal traffic) only "see" up to 8 events that you've prioritized via AEM. If your priority list is wrong, you lose iOS attribution silently.

1. Open **Events Manager → Web Events Configuration** (look for "Aggregated Event Measurement" section).
2. Confirm position 1 is **Purchase** (auto-prioritized — leave it).
3. Lower positions (2-8) can stay default or be filled with funnel events you might add later (`InitiateCheckout`, `AddToCart`, `Lead`, etc.).
4. **Do NOT add `sales` to the AEM list.** Purchase already covers your paid conversions for iOS. Adding sales would waste a slot for zero benefit (sales fires on identical transactions to Purchase).

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

1. You launch a second offer from the same pixel (e.g., free webinar) that also fires `Purchase`. Then switch THIS campaign to optimize on the custom event (`sales`) to isolate paid conversions from the free signups. Note: you'd also need to manually add the custom event to AEM at the cost of demoting another event.
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
  Purchase = AEM/iOS coverage + Meta algorithm priors.
  sales    = internal source-of-truth label.
  Both fire on the same real Razorpay transaction.

WHERE'S THE MONEY NUMBER?
  Pabbly Google Sheet. Always.

WHO TO PING IF CPR DOUBLES?
  Engineering first (check CAPI is firing).
  Media buyer second (check creative/audience).
  Don't pause campaigns under 48h of confusion.
```
