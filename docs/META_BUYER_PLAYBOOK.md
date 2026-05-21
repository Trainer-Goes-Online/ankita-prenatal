# Meta Ads — Media Buyer Operational Playbook

Your reference for everything that happens AFTER the engineering team ships the Meta tracking stack. Covers verification, settings to flip, ongoing monitoring, the reporting hierarchy, and when to escalate to the developer.

Pair this with `META_TRACKING_AGENT_GUIDE.md` (the engineering side). The two docs are designed together.

---

## Section 1 — Day 0: verify the deploy

Run this within 1 hour of the engineering team confirming the deploy is live.

### 1.1 — Events Manager → Test Events tab

1. Open Events Manager → your dataset → **Test Events** tab.
2. Copy the test event code shown (e.g. `TEST12345`).
3. Run ONE real paid transaction through the live funnel (real money, you'll refund yourself afterward).
4. Within 30 seconds, the Test Events panel should show:
   - **`PageView`** events (one per page visited during the journey)
   - **`Purchase`** event from "Server" — EMQ should be 9.5+/10
   - **`<custom>`** event (e.g. `sales`, `leads`) from "Server" — EMQ should be 9.5+/10
5. Open the `Purchase` event card. Confirm these parameters are populated:
   - `event_source_url` (your production checkout URL)
   - `em` (email, hashed)
   - `ph` (phone, hashed)
   - `fn`, `ln`, `ct`, `country` (hashed)
   - `fbc`, `fbp` (raw — these are Meta's own cookies)
   - `client_ip_address`, `client_user_agent` (raw)
   - `value`, `currency`, `payment_id` under `custom_data`

> Note: `external_id` is NOT shown in the Test Events tool by Meta's design. That's expected — it'll appear in the production dashboard within 24h.

### 1.2 — Events Manager → Overview tab

Confirm each event row's "Integration" column:
- `Purchase` → **Conversions API** (or "Server" / "Server + Browser")
- `<custom>` → **Conversions API**
- `PageView` → Pixel (and "Manual" + "Automatic" advanced matching activity should be visible)

If any of these say "Estimated" or "URL-inferred" instead → flag the developer immediately, something's misconfigured.

### 1.3 — Events Manager → Diagnostics tab

The following warnings should all be **absent** (or about to clear within 72h):
- "Some Conversions API events will be blocked in 60 days" (about event_source_url)
- "Confirm domain that belong to you"
- "Set up manual advanced matching"

If any persist beyond 72 hours → flag the developer with a screenshot of the diagnostic.

### 1.4 — Refund yourself

Refund the test transaction via the payment provider dashboard. This does NOT remove the Purchase event from Meta (events are immutable), but for your finance/CRM records the transaction is clean.

---

## Section 2 — Meta UI settings: what to flip OFF

These are **one-time setup** actions. Once flipped, leave them.

### 2.1 — "Track events automatically without code" → OFF

**Path:** Events Manager → your pixel → **Settings** → scroll to **Event setup** section → toggle **OFF**.

**Why OFF:**
- The engineering team's CAPI fires authoritative `Purchase` and `<custom>` events with full identity payloads (EMQ 9.5+).
- This toggle enables Meta to also infer events from URL patterns and page metadata. Those inferred events have NO `event_id`, NO hashed user identity → they can't deduplicate against our explicit events → they inflate the dashboard count.
- For restricted categories (health, prenatal, financial), data quality matters more than data quantity. Inferred events drag your average EMQ down.

**Visible impact after flipping OFF (within 7 days):**
- `Purchase` event count converges toward real transaction count (no more 86 vs 26 inflation)
- EMQ for `Purchase` rises (no more low-quality inferred events polluting the average)
- "View content" and "Initiate checkout" auto-event rows should also stop firing (or drop significantly)

### 2.2 — "Automatic Advanced Matching (AAM)" → OFF

**Path:** Events Manager → your pixel → **Settings** → scroll to **Automatic Advanced Matching** → toggle **OFF**.

**Why OFF:**
- The engineering team's Manual Advanced Matching (MAM) does this job deterministically — hashing form fields client-side and shipping them on every event.
- AAM relies on DOM-scanning heuristics to extract user data from forms. It's noisy: catches partial data, misses some users, can trigger built-in event detection that creates phantom events.
- With MAM in place, AAM is redundant AND adds noise.

**Visible impact after flipping OFF (within 7 days):**
- `Purchase` event row shows "Setup mode: **Manual**" (not "Automatic & manual")
- Inferred upper-funnel events (`ViewContent`, `InitiateCheckout`) stop firing or drop significantly
- All conversions in dashboard come from explicit code (our CAPI + browser PageView) → clean, predictable

### 2.3 — Domain Allow List → production domain ONLY

**Path:** Events Manager → your pixel → **Settings** → **Traffic permissions — websites** → **Allow list** → **Edit**.

Add ONLY your production domain (e.g. `prenatal.bodyworx.in`). Remove any:
- Vercel preview URLs (`*.vercel.app`)
- Staging domains
- Localhost
- Old domain names

Why: any event from a non-allowlisted domain gets dropped silently. Conversely, dev/staging traffic gets accidentally counted if those domains ARE allowlisted.

### 2.4 — Conversion event domain → leave as-is

Per Meta's Oct 2024 AEM update, there's no longer a "conversion domain" selection in Ads Manager campaign creation. If you see the option in some legacy UI, leave it pointing at your production domain.

### 2.5 — Aggregated Event Measurement → leave as-is

Per Meta's Oct 2024 update, AEM is now fully automatic for website conversions. The 8-event priority cap, the manual prioritization workflow, and the "Web Events Configuration" tab have all been removed. **There's nothing to configure.**

If your account hasn't fully migrated and you still see the old prioritization UI:
- Leave `Purchase` at position 1 (auto-default)
- Do NOT add `<custom>` (e.g. `sales`) to the list — it fires on the same transaction as `Purchase`, same-session rule means only the higher-priority event reports
- Don't reshuffle (the old 72-hour cooldown still applies)

---

## Section 3 — Day 0-7: do NOT change campaign settings

Your campaign is optimizing on `Purchase`. **Don't touch it for 7 days.**

What's happening under the hood:
- Meta is recalibrating its model with the new clean, high-EMQ signal from CAPI
- Dedup cache is being populated for `event_id`-matched conversion attribution
- Inferred events (if any were firing pre-toggle-off) are aging out of the 7-day window
- AEM iOS attribution is settling

**CPR may bounce ±20% during the first 2-3 days.** This is normal. Do NOT pause, edit, or duplicate ad sets unless CPR rises >50% above baseline for >48 hours.

---

## Section 4 — Day 7: review and document the lift

By day 7, the cleaner signal is fully baked in. Check:

| Metric | Where | Expected |
|---|---|---|
| Campaign Results (Purchase count) | Ads Manager → campaign → Results column | Same or higher than pre-change baseline |
| Cost per Result | Ads Manager → CPR column | **Lower than baseline** — typical drop 15-35% for restricted categories |
| EMQ for `Purchase` | Events Manager → Purchase row | **9.5+/10** |
| EMQ for `<custom>` | Events Manager → custom event row | **9.5+/10** |
| Match rate | Events Manager → Diagnostics → Event Match Quality | 85-95% (vs ~40-60% pre-CAPI) |
| `Purchase` total count | Events Manager → Overview | ≈ 1× real transaction count (with browser Purchase NOT firing — see Section 6 for the exception case) |
| PageView EMQ | Events Manager → PageView row | 6.5-7.5 (weighted average: ~6 for new visitors, ~8 for returning) |

**Document the before/after CPR.** This is your single biggest performance lever on Meta short of changing creative or audience.

---

## Section 5 — Reporting hierarchy (memorise this)

> **Campaign Results column = the campaign's optimization event count. That is the real conversion number. Don't add `Purchase` + `<custom>` together — they fire on the same transaction.**

| What number to use | Where | When to cite it |
|---|---|---|
| Real campaign conversions | Ads Manager → campaign → **Results** column | Daily ad performance, CPR, ROAS, client-facing reports |
| Internal cross-channel attribution | Events Manager → **`<custom>`** custom event row | Weekly review, comparing Meta vs other sources |
| Revenue source of truth | Payment provider dashboard + Pabbly Google Sheet | Finance, refunds, payouts, anything money-related |
| **AGGREGATE Events Manager count** | Events Manager → Overview total events | Diagnostics only — **never cite as conversions**. Will roughly equal `2 × real` if browser Purchase is firing (escalation case), else `1 × real`. |

If a stakeholder asks "why does Events Manager show 28 events when we only had 14 sales?" — answer: "Two events per conversion: standard `Purchase` for Meta's algorithm, custom `<name>` for our internal naming. Campaign Results column shows the real 14."

---

## Section 6 — Escalation playbook: when to ping the developer

You're the canary for Meta-side issues. Ping the developer (with a screenshot) when any of these appear.

### 6.1 — Diagnostic warnings appearing in Events Manager

Any new warning under Events Manager → **Diagnostics** tab → "Active errors" — flag immediately.

Common warnings and what they mean:
- **"Some Conversions API events will be blocked in 60 days"** → `event_source_url` is missing from CAPI events. Developer fix needed.
- **"Confirm domain that belong to you"** → events arriving from a new domain. Either add to allow list (if intentional, e.g. you launched a new TLD) or fix the source (events shouldn't fire from preview URLs).
- **"Set up manual advanced matching"** → MAM init isn't firing. Developer fix needed.
- **"Improve deduplication for Purchase event"** → THIS IS THE BROWSER-PURCHASE TRIGGER, see Section 6.3 below.

### 6.2 — Wrong event counts in dashboard

**Compare these three numbers for the same day:**
1. Payment provider dashboard (Razorpay/Stripe/etc.) — real transactions
2. Pabbly Google Sheet — CRM sync count
3. Events Manager → `<custom>` event count (e.g. `sales`)

These three should match within 1-2 events (allowing for rare CAPI failures).

If `<custom>` count is **significantly lower** than payment provider count (>10% delta):
- CAPI is failing for some transactions → developer fix needed (check server logs)

If `<custom>` count is **higher** than payment provider count:
- Test/QA transactions are polluting → developer should switch to test payment keys for local dev

### 6.3 — "Improve deduplication" OR `Purchase` count ≠ `<custom>` count

This is the **specific trigger** for adding the browser-side `Purchase` event (Section 7 of the agent guide).

**Ping the developer if:**
- Events Manager → Diagnostics shows "Improve deduplication for Purchase event"
- OR: Events Manager → Overview shows `Purchase` count is **>20% different** from `<custom>` count (in either direction)
- OR: Campaign Results column substantially mismatches real transaction count after 7 days

Send the developer this message template:

```
We're seeing dedup issues on the Purchase event. Please add browser-side
Purchase per Section 7 of META_TRACKING_AGENT_GUIDE.md.

Symptoms:
- [paste screenshot of Diagnostics warning OR Events Manager event counts]
- Purchase count: [X], <custom> count: [Y], real transactions: [Z]
- Campaign Results column showing: [N], expected: [Z]

Pixel: [pixel ID]
Domain: [domain]
```

The developer will add a single `trackPurchasePixel` call to the form's payment-success handler. After 24-48h, the campaign Results column will normalise to the real conversion count.

### 6.4 — EMQ drops below 9.0 on Purchase

If you're seeing EMQ 9.0+ consistently and then it drops:
- Could indicate AAM was accidentally re-enabled (low-quality auto events pulling down the average)
- Could indicate the MAM cookie is broken (recent layout.tsx change?)
- Could indicate event_source_url stopped being sent

Flag the developer with the EMQ trend (Events Manager → Purchase row → click for detail).

### 6.5 — Sudden spike in PageView count

If PageView count jumps unusually (e.g. 3x your normal traffic with no campaign change):
- Could indicate auto-events were re-enabled
- Could indicate a third-party script started firing extra PageViews
- Could indicate iOS users are now firing duplicate PageViews via some browser quirk

Flag the developer to investigate.

---

## Section 7 — How CAPI + AEM + iOS attribution all work together

You don't need to memorise this, but understanding the moving parts helps when stakeholders ask why something looks the way it does.

### 7.1 — iOS ATT context

When Apple shipped iOS 14.5 in 2021, the ATT (App Tracking Transparency) prompt let users opt OUT of cross-app tracking. ~75-80% of iOS users in India opt out. For these users, Meta cannot use IDFA-based tracking to attribute conversions.

### 7.2 — CAPI bypasses ATT entirely

Server-to-server traffic between your server and Meta's servers doesn't go through Apple's tracking restrictions. CAPI fires regardless of whether the user opted in or out of ATT. This is why your funnel is built on CAPI — it's ATT-proof.

### 7.3 — AEM (Aggregated Event Measurement)

For browser-side pixel events (PageView, etc.) from iOS opt-out users, Meta uses AEM as the privacy-compliant fallback:
- Reporting is delayed 24-48h
- Aggregated at domain level (no individual user attribution)
- Per Meta's Oct 2024 update: now fully automatic, no configuration needed

### 7.4 — Why we fire both Purchase + `<custom>` from CAPI

- **`Purchase`** is a standard event. Meta has billions of cross-account Purchase events to train its ML model. Algorithm priors are mature. iOS attribution is automatic.
- **`<custom>`** is a custom event. No global priors — Meta has to learn what it means from your per-account data only. Slower optimization.

We optimize the campaign on `Purchase` for fast learning. We keep `<custom>` as the internal source-of-truth label and for cross-channel reporting clarity. Both fire with the same `event_id` and same payload, single HTTP call.

### 7.5 — When to switch optimization to `<custom>` (very rare)

Stay on `Purchase` optimization unless one of these happens:
- A second offer from the same pixel also fires `Purchase` (e.g., free webinar in addition to paid product) — then switch THIS campaign to `<custom>` to isolate paid conversions from the free signups
- Meta's Purchase event is being inferred from non-conversion URLs (false positives that resist the toggle-off fix) — switch to `<custom>` because it's strictly server-verified

In both cases, talk to the developer first.

---

## Section 8 — Quick reference card (Slack-share this)

```
WHICH EVENT DOES THE CAMPAIGN OPTIMIZE ON?
  Purchase. Forever. For this funnel.

WHICH NUMBER IS REAL?
  Campaign Results column. NOT Events Manager total.

WHAT TOGGLES SHOULD BE OFF (one-time setup)?
  - Track events automatically without code: OFF
  - Automatic Advanced Matching (AAM):       OFF

WHAT TOGGLES SHOULD BE ON?
  - (none - manual setup handles everything)

WHY ARE THERE TWO EVENTS FIRING (Purchase + <custom>)?
  Purchase = Meta's mature ML priors + AEM iOS attribution.
  <custom> = internal source-of-truth label.
  Both fire on the same real paid transaction, same payload.

WHERE'S THE MONEY NUMBER?
  Payment provider dashboard + Pabbly Sheet. Always.

WHEN TO PING THE DEVELOPER?
  - Diagnostic warning appears in Events Manager
  - Purchase count ≠ <custom> count by >20%
  - "Improve deduplication" notice appears
  - EMQ drops below 9.0 on Purchase
  - Campaign Results column doesn't match real transactions after 7 days

WHEN TO PAUSE CAMPAIGNS?
  Don't — unless CPR rises >50% above baseline for >48 hours.
  First 2-3 days of any major change: expect ±20% CPR variance.
```

---

## Section 9 — Glossary

| Term | Meaning |
|---|---|
| **CAPI** | Conversions API. Server-to-server event reporting from our backend to Meta. ATT-proof. |
| **EMQ** | Event Match Quality. Meta's score (1-10) of how well our event data lets them identify the user. Higher = more attributed conversions. |
| **MAM** | Manual Advanced Matching. We explicitly send hashed user_data to the pixel via `fbq('init')`. |
| **AAM** | Automatic Advanced Matching. Meta auto-extracts form data via DOM scanning. Off in our setup (MAM does this better). |
| **AEM** | Aggregated Event Measurement. Meta's privacy-compliant attribution for iOS opt-outs. Fully automatic since Oct 2024. |
| **ATT** | App Tracking Transparency. Apple's iOS 14.5+ prompt asking users to opt in/out of tracking. |
| **Dedup** | Deduplication. Meta combines browser + server events with matching `event_id` into a single attributed conversion. |
| **fbc** | Cookie set by Meta when a user lands from a Meta ad with `?fbclid=...` in the URL. Used as a matching signal. |
| **fbp** | Cookie set by Meta on first pixel-loaded visit. Persists 90 days. Used as a matching signal. |
| **event_id** | Unique identifier per conversion (typically the payment ID). Browser + server events with the same `event_id` get deduplicated. |
| **external_id** | Stable per-USER identifier sent on every event for the same user. We use `sha256(email)`. Meta caches the external_id → Facebook user mapping for re-matching. |
| **event_source_url** | The URL the user was on when the conversion happened. Required for CAPI events with `action_source: website` since Feb 2021. |
| **Results column** | The conversion count in Ads Manager. Equal to the count of the optimization event (Purchase). This is the real attributed number, post-dedup. |
