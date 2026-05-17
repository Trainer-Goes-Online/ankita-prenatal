# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

**BodyWorx - Prenatal Challenge.** A single-funnel Next.js marketing site that sells the *3-Day Prenatal Pain Relief & Labor Prep Challenge* (₹297) via Razorpay, with leads pushed to a Pabbly Connect webhook and (optionally) Meta Conversions API.

Target domain: `bodyworx.in`. Deployed on Vercel.

This is one of two sibling codebases (prenatal and postpartum). They share the same Razorpay merchant account, but **the Meta Pixel ID must be unique per project** - this is the reason the funnels are split into separate repos rather than living in one app with two routes.

## Tech stack

- **Next.js 14.2** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** (custom `brand`/`ink`/`line` palette, custom keyframes, `bw-wrap` container in `globals.css`)
- **Framer Motion** for section animations
- **Phosphor Icons** (`@phosphor-icons/react/dist/ssr`) - note the `/ssr` import path
- **Razorpay** Node SDK + Razorpay Checkout.js (loaded as `<Script>` in `app/layout.tsx`)
- **libphonenumber-js** for phone validation in the checkout form
- Fonts: Plus Jakarta Sans (heading), Poppins (body), Fraunces (editorial) - loaded via `next/font/google` in `app/layout.tsx`

## Commands

```bash
npm install
cp .env.local.example .env.local   # then fill in real keys
npm run dev          # next dev - http://localhost:3000
npm run build        # next build (production)
npm run start        # next start (serves the production build)
npm run lint         # next lint (eslint-config-next)
npm run type-check   # tsc --noEmit  - there is no test runner configured
```

There are **no tests** in this repo. "Verification" means: run `npm run dev`, walk the funnel (landing → checkout → thank-you), and confirm a Razorpay test payment / `tgotest2025` coupon flow end-to-end.

## Routes

| Route | File |
|---|---|
| `/` | [app/page.tsx](app/page.tsx) - landing, composed of `components/sections/*` |
| `/checkout` | [app/checkout/page.tsx](app/checkout/page.tsx) - wraps `CheckoutForm` |
| `/thank-you` | [app/thank-you/page.tsx](app/thank-you/page.tsx) |
| `/privacy-policy`, `/terms-and-conditions`, `/refund-policy` | static legal pages using `LegalPageLayout` |
| `POST /api/razorpay/create-order` | [app/api/razorpay/create-order/route.ts](app/api/razorpay/create-order/route.ts) |
| `POST /api/razorpay/verify-payment` | [app/api/razorpay/verify-payment/route.ts](app/api/razorpay/verify-payment/route.ts) |

## Folder layout

- [app/](app/) - App Router pages, `layout.tsx` (fonts, footer, GA4/Clarity/Razorpay scripts), `globals.css`, and `api/razorpay/*` server routes.
- [components/sections/](components/sections/) - one file per landing-page section. `app/page.tsx` is the ordered composition.
- [components/](components/) - shared UI: `CheckoutForm.tsx` (the only large client component), `Navigation`, `StickyMobileCTA`, `LegalPageLayout`, `UtmCapture`, `PaymentLogos`, etc.
- [lib/](lib/) - pure modules, no React: `checkout-config.ts`, `coupons.ts`, `utm.ts`, `analytics.ts`.
- [public/](public/) - `team/`, `testimonials/`, `transformations/` image assets used by section components.

Path alias: `@/*` → repo root (see `tsconfig.json`). Always import as `@/components/...`, `@/lib/...`.

## Architecture - the checkout flow

The whole codebase exists to make this flow work. Touching any of these files requires understanding the whole chain:

1. **Landing/Hero CTAs** → navigate to `/checkout` (UTMs are appended by `lib/utm.ts#withUtm`).
2. **`CheckoutForm`** collects name/email/city/phone (+ optional coupon), POSTs to `/api/razorpay/create-order`.
3. **`create-order`** (server) validates the coupon via `lib/coupons.ts`, then either:
   - **Paid branch:** creates a real Razorpay order at `CHECKOUT_CONFIG.amountPaise` (or coupon-discounted amount) and returns `{ orderId, amount, keyId, ... }`. Client opens the Razorpay modal.
   - **Free branch** (100%-off coupons like `tgotest2025`): Razorpay rejects ₹0 orders, so the server mints a `free_*` order ID + HMAC-SHA256 token (signed with `RAZORPAY_KEY_SECRET`) and returns `freeOrder: true`. Client skips the modal and calls verify-payment directly.
4. **`verify-payment`** (server) does one of two things:
   - **Paid:** verifies `HMAC_SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET) === signature`, then re-fetches the payment from Razorpay to get the **authoritative paid amount** (coupon-discounted orders must report what was actually charged, not the list price).
   - **Free:** re-validates the coupon AND re-derives the HMAC token to confirm the client didn't fabricate a `free_*` order.
5. On success, fires **`PABBLY_WEBHOOK_URL`** with the full customer + payment + UTM payload (failures are logged, not surfaced - the user still sees the thank-you page).
6. If `META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN` are both set, also fires the **Meta CAPI Purchase event** (email/phone are SHA-256 hashed; `_fbc`/`_fbp` cookies + IP + UA are forwarded).
7. Client redirects to `/thank-you`.

**Invariant:** the server is the only authority on price. Never trust a client-sent amount. Coupons resolve to a paise amount inside `lib/coupons.ts`; `verify-payment` re-validates rather than trusting `create-order`'s output.

## Architecture - pricing

Price flows from **one env var** through `lib/checkout-config.ts`:

```
NEXT_PUBLIC_OFFER_PRICE_RUPEES=297        →  CHECKOUT_CONFIG.amountPaise (× 100, Razorpay)
                                              CHECKOUT_CONFIG.amountRupeesString (Pabbly)
                                              CHECKOUT_CONFIG.amountRupeesNumeric (CAPI, UI)
NEXT_PUBLIC_OFFER_LIST_PRICE_RUPEES=997   →  CHECKOUT_CONFIG.listPriceRupees (strikethrough)
```

The `NEXT_PUBLIC_` prefix is **required** - these render in client components too. To change the price, update the env var; do not hardcode amounts in section components.

Things that are **not** env-driven and live as literals in section components: class timings (`7 AM · 4 PM · 7 PM IST`) and the start date (`21st May`).

## Architecture - UTMs

`components/UtmCapture.tsx` runs on every page mount and calls `lib/utm.ts#syncUtmWithUrl`, which:

1. Reads `utm_*` from `window.location.search` and caches them in the `bodyworx_utm` cookie (30-day TTL).
2. If the URL has no UTMs but the cookie does, rewrites the URL via `history.replaceState` so the address bar always reflects the cached campaign attribution.

Internal `<Link>` CTAs use `withUtm(path)` so UTMs survive Next.js client navigation (which otherwise drops query params). The checkout form reads the cookie and forwards UTMs to `verify-payment`, which puts them in the Pabbly payload.

## Tracking IDs - where they live

- **GA4 + Microsoft Clarity:** literal strings in [app/layout.tsx](app/layout.tsx) (`GA4_MEASUREMENT_ID`, `CLARITY_PROJECT_ID`). Empty by default; the `<Script>` tags only render when filled. **Not env vars.**
- **Meta Pixel client init:** also belongs in `layout.tsx` (currently absent - `lib/analytics.ts#trackPurchaseComplete` calls `window.fbq` defensively).
- **Meta CAPI (server):** `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` env vars, consumed in `verify-payment`. CAPI block is optional - if both env vars are absent, the block no-ops and logs a warning.
- **Razorpay keys:** `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (server) + `NEXT_PUBLIC_RAZORPAY_KEY_ID` (client modal).
- **Pabbly:** `PABBLY_WEBHOOK_URL` (server-only).

## Conventions worth knowing

- Phosphor icons import from `@phosphor-icons/react/dist/ssr` (server-component-safe). Don't import from the root package - it ships client-only.
- `app/page.tsx` is purely compositional; section components own their own data, copy, and styling. Reordering the funnel = reordering JSX in `app/page.tsx`.
- The `tgotest2025` coupon is an agency QA tool (100% off, bypasses Razorpay entirely via the signed free-order flow). Real registrations report nonzero amounts to the CRM; test ones report `amount=0` and `free_order=true` so they're visually distinct in Pabbly.
- `.env.local.example` ships with **real production Razorpay live keys** committed in plaintext - they are not placeholders. Treat that file accordingly when sharing the repo.
- There is no `BACKEND_SOP.md` in this repo despite multiple comments referencing it; it lived in the team's process docs, not source.
