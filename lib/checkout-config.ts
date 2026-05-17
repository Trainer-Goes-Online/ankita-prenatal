/**
 * Prenatal challenge — checkout config (single source of truth).
 *
 * Price is env-controlled so it can be changed without touching code:
 *
 *     NEXT_PUBLIC_OFFER_PRICE_RUPEES=297        # what the user pays
 *     NEXT_PUBLIC_OFFER_LIST_PRICE_RUPEES=997   # strikethrough "was" price
 *
 * NEXT_PUBLIC_ prefix is required because these values render in the browser
 * UI (Hero, offer card, CTAs, etc.) as well as on the server-side
 * Razorpay/Pabbly/CAPI calls.
 *
 * Per BACKEND_SOP.md the three amount representations are confirmed
 * separately and never derived from each other — they're all sourced here
 * from the same PRICE_RUPEES env value:
 *   - Razorpay  → paise, numeric  (PRICE_RUPEES × 100)
 *   - Pabbly    → rupees, string  (String(PRICE_RUPEES))
 *   - Meta CAPI → rupees, numeric (PRICE_RUPEES)
 */

function parsePriceEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PRICE_RUPEES = parsePriceEnv(process.env.NEXT_PUBLIC_OFFER_PRICE_RUPEES, 297);
const LIST_PRICE_RUPEES = parsePriceEnv(
  process.env.NEXT_PUBLIC_OFFER_LIST_PRICE_RUPEES,
  997
);

const CHALLENGE_DAYS = parsePriceEnv(process.env.NEXT_PUBLIC_CHALLENGE_DAYS, 3);
const CHALLENGE_START_DATE = process.env.NEXT_PUBLIC_CHALLENGE_START_DATE || '22nd May';
const CHALLENGE_TIME_SLOTS = process.env.NEXT_PUBLIC_CHALLENGE_TIME_SLOTS || '7 AM · 4 PM · 7 PM IST';
const CHALLENGE_BRAND_NAME = `${CHALLENGE_DAYS}-Day Prenatal Pain Relief & Labor Prep Challenge`;

/**
 * Derive an array of slot labels (without timezone) from the display string.
 * Accepts "·" or "," as separator and strips a trailing timezone token like
 * "IST" / "UTC" from the last slot. Used by DailySchedule's pill row.
 */
function parseTimeSlots(s: string): string[] {
  const parts = s.split(/[·,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  parts[parts.length - 1] = parts[parts.length - 1].replace(/\s+[A-Z]{2,4}$/, '');
  return parts;
}
const CHALLENGE_TIME_SLOT_LIST = parseTimeSlots(CHALLENGE_TIME_SLOTS);

export const CHECKOUT_CONFIG = {
  amountPaise: PRICE_RUPEES * 100,
  amountRupeesString: String(PRICE_RUPEES),
  amountRupeesNumeric: PRICE_RUPEES,
  listPriceRupees: LIST_PRICE_RUPEES,
  savingsRupees: Math.max(0, LIST_PRICE_RUPEES - PRICE_RUPEES),
  currency: 'INR',
  paymentTimezone: 'Asia/Kolkata',

  challenge: {
    days: CHALLENGE_DAYS,
    startDate: CHALLENGE_START_DATE,
    timeSlots: CHALLENGE_TIME_SLOTS,
    timeSlotList: CHALLENGE_TIME_SLOT_LIST,
    brandName: CHALLENGE_BRAND_NAME,
  },

  razorpayModal: {
    name: 'BodyWorx',
    description: CHALLENGE_BRAND_NAME,
    themeColor: '#F24C69',
  },

  capi: {
    // Custom event name (not a Meta standard event). Reported by the server-side
    // CAPI call in /api/razorpay/verify-payment for every paid order. Free QA
    // coupon orders are skipped server-side so the pixel isn't polluted.
    eventName: 'sales',
    value: PRICE_RUPEES,
    currency: 'INR',
  },

  thankYouPath: '/thank-you',
  funnelSlug: 'prenatal-challenge',
  utmSessionKey: 'bodyworx_utm',
};
