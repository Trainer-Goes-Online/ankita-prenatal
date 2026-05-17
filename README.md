# BodyWorx - Prenatal Challenge

Next.js 14 (App Router) site for the **3-Day Prenatal Pain Relief & Labor Prep Challenge** (₹297).

Domain target: `bodyworx.in` (primary).

## Stack

- Next.js 14, TypeScript, Tailwind, Framer Motion, Phosphor Icons
- Razorpay (live keys), Pabbly webhook, optional Meta CAPI / GA4 / Clarity

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/checkout` | Razorpay 2-col checkout |
| `/thank-you` | Order confirmed + WhatsApp invite |
| `/privacy-policy` | Privacy policy |
| `/terms-and-conditions` | Terms of use |
| `/refund-policy` | 7-day money-back guarantee |
| `/api/razorpay/create-order` | Server route - creates Razorpay order |
| `/api/razorpay/verify-payment` | Server route - verifies HMAC signature |

## Local setup

```bash
npm install
cp .env.local.example .env.local
# Fill in Razorpay keys + Pabbly webhook + (optional) Meta pixel
npm run dev
```

Visit http://localhost:3000.

## Required environment variables

See `.env.local.example`. The Razorpay keys can be **shared** with the postpartum project (same merchant account), but the **Meta Pixel ID must be unique per project** - this is exactly why the prenatal and postpartum funnels are split into separate codebases.

## Deploy to Vercel

1. Push to a new GitHub repo.
2. Import the repo into Vercel.
3. Add the same env vars from `.env.local` in the Vercel project's settings.
4. Set the production domain to `bodyworx.in` (or your prenatal domain).
5. First deploy will run `next build` automatically.

## Pricing & content

- Price is controlled by `NEXT_PUBLIC_OFFER_PRICE_RUPEES` (default `297`).
- All checkout/CTA prices read from `lib/checkout-config.ts` which sources from that env var.
- Class timings (`7 AM · 4 PM · 7 PM IST`) and start date (`21st May`) are hardcoded in the section components.
