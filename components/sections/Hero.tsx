'use client';

import CheckoutLink from '@/components/CheckoutLink';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import PaymentLogos from '@/components/PaymentLogos';
import Icon3D from '@/components/Icon3D';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import {
  ArrowRight,
  Gift,
  Flame,
  Star,
  Check,
  Lightning,
  ShieldCheck,
  CalendarBlank,
} from '@phosphor-icons/react/dist/ssr';

/* ──────────────────────────────────────────────────────────────────────
 *  Motion - exponential ease, no springs (Impeccable).
 * ─────────────────────────────────────────────────────────────────── */
const EASE_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_QUINT } },
};

const visual: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.05, ease: EASE_QUINT, delay: 0.15 },
  },
};

const STRUGGLES =
  'Back pain · Pelvic pain · Stiffness · Fear of exercise · Breech anxiety · Low energy · Labor fear';

const BENEFITS: string[] = [
  'Reduce back & pelvic pain',
  'Stronger pelvic floor + deep core',
  'Master labor breathing',
  'Breech baby guidance',
  'Better daily posture',
  'Calmer mind for delivery',
];

type TrustItem =
  | { kind: 'stars'; label: string }
  | { kind: 'icon3d'; icon3d: string; label: string };

const TRUST: TrustItem[] = [
  { kind: 'stars', label: '4.9 · 5,000+ moms' },
  { kind: 'icon3d', icon3d: 'heart', label: 'Physio-Led' },
  { kind: 'icon3d', icon3d: 'laptop', label: 'Live on Zoom' },
  { kind: 'icon3d', icon3d: 'yoga', label: 'No Equipment' },
  { kind: 'icon3d', icon3d: 'refund', label: 'Money-Back' },
];

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? 'visible' : 'hidden';

  return (
    <section className="relative bg-cream-fade">
      {/* ────────────────── 1. Top urgency strip - DARK marquee ──────────────────
       * Two copies of the content sit inside a `width: max-content` track and
       * the track animates -50% to land exactly on the duplicate, producing a
       * seamless loop. `prefers-reduced-motion` halts entirely.
       * ─────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-brand-deep text-white">
        {/* Edge-fade masks so the loop seam never reads as a hard cut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-deep to-transparent sm:w-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-deep to-transparent sm:w-20"
        />

        <div
          className="bw-marquee-track py-2.5 text-[12.5px] font-medium leading-tight sm:py-3 sm:text-[13.5px]"
          role="marquee"
          aria-label="Special offer and price-increase notice"
        >
          {/* Group 1 (visible) + Group 2 (aria-hidden duplicate for seamless loop) */}
          <MarqueeGroup
            price={CHECKOUT_CONFIG.amountRupeesNumeric}
            listPrice={CHECKOUT_CONFIG.listPriceRupees}
          />
          <MarqueeGroup
            price={CHECKOUT_CONFIG.amountRupeesNumeric}
            listPrice={CHECKOUT_CONFIG.listPriceRupees}
            ariaHidden
          />
        </div>
      </div>

      {/* ────────────────── 2. Main hero body ────────────────── */}
      <motion.div
        initial={initial}
        animate="visible"
        variants={container}
        className="bw-wrap relative z-10 pt-10 pb-14 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24"
      >
        {/* Struggle pill bar - LIGHT (alternates with the dark marquee above) */}
        <motion.div variants={item} className="mx-auto max-w-4xl">
          <p className="rounded-pill border border-brand-soft bg-brand-soft px-5 py-2.5 text-center text-[10.5px] font-bold uppercase leading-snug tracking-[0.12em] text-brand-deep shadow-soft sm:text-[11px] sm:tracking-[0.16em] md:px-7 md:py-3">
            <LiveDot />
            For pregnant moms struggling with{' '}
            <span >{STRUGGLES}</span>
          </p>
        </motion.div>

        {/* Eyebrow */}
        <motion.p
          variants={item}
          className="mx-auto mt-9 max-w-3xl text-center text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-soft sm:mt-12 sm:text-[11.5px]"
        >
          India&apos;s trusted prenatal physio · 12+ years · 5,000+ moms guided
        </motion.p>

        {/* Editorial headline */}
        <motion.h1
          variants={item}
          className="mx-auto mt-4 max-w-5xl text-center font-editorial text-[34px] font-medium leading-[1.22] tracking-[-0.01em] text-ink sm:mt-5 sm:text-[52px] sm:leading-[1.15] lg:text-[64px] lg:leading-[1.1] xl:text-[72px]"
        >
          Reduce your{' '}
          <span className="relative inline-block leading-none">
            <span className="relative z-10 text-white">pregnancy pain,</span>
            <span
              aria-hidden="true"
              className="absolute inset-x-[-10px] inset-y-[-14%] -z-0 rounded-[6px] bg-brand-deep sm:inset-x-[-14px] sm:inset-y-[-16%] sm:rounded-[8px]"
            />
          </span>{' '}
          prepare your body for labor, and feel stronger in just
          <span className="relative inline-block leading-none">
          <span className="relative z-10 text-white">3 days.</span>
          <span
              aria-hidden="true"
              className="absolute inset-x-[-10px] inset-y-[-14%] -z-0 rounded-[6px] bg-brand-deep sm:inset-x-[-14px] sm:inset-y-[-16%] sm:rounded-[8px]"
            /> 
            </span>
             {' '}Starting from 
          <span className="italic text-brand-deep"> {process.env.NEXT_PUBLIC_CHALLENGE_START_DATE}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-3xl text-center text-[15px] leading-relaxed text-ink-soft sm:mt-7 sm:text-[16px]"
        >
          A live, physiotherapist-led prenatal challenge by{' '}
          <strong className="text-ink">Dr. Ankita</strong>, designed to reduce
          pain, prepare your body for labor, and help you feel stronger going
          into delivery.
        </motion.p>

        {/* ─── Two-column: photo collage + offer card ─── */}
        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 xl:gap-14">
          {/* LEFT: Photo collage */}
          <motion.div
            initial={initial}
            animate="visible"
            variants={visual}
            className="relative mx-auto w-full max-w-[480px] lg:max-w-none"
          >
            {/* Soft background bloom */}
            <div
              aria-hidden="true"
              className="absolute inset-x-4 top-8 -z-0 h-[78%] rounded-full bg-brand-rose blur-2xl opacity-70"
            />

            <div className="relative">
              {/* Main portrait card */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[0_30px_80px_-20px_rgba(146,68,83,0.45)]">
                {/* Background photo - clean, no tint */}
                <Image
                  src="/transformations/drankitabg.jpeg"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 480px, 560px"
                  className="object-cover object-center"
                  priority
                />

                {/* Identity caption - editorial glass chip */}
                <div className="absolute inset-x-0 bottom-20 flex justify-center px-5 sm:bottom-24">
                  <div className="inline-flex flex-col items-center rounded-2xl bg-black/40 px-6 py-3.5 text-center shadow-[0_18px_50px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/25 backdrop-blur-md sm:px-7 sm:py-4">
                    <p className="font-editorial text-[26px] font-semibold leading-none tracking-tight text-white sm:text-[32px]">
                      Dr. Ankita
                    </p>
                    <span
                      aria-hidden="true"
                      className="my-2 block h-px w-10 bg-white/70 sm:my-2.5 sm:w-12"
                    />
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-white sm:text-[11.5px]">
                      Women&apos;s Health Physio
                    </p>
                  </div>
                </div>

                {/* Bottom caption strip */}
                <div className="absolute inset-x-0 bottom-0 border-t border-white/20 bg-gradient-to-t from-brand-deep/40 to-transparent backdrop-blur-sm">
                  <div className="flex items-center justify-between px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 sm:text-[11px]">
                    <span>Prenatal Method™</span>
                    <span>Est. 2012</span>
                  </div>
                </div>
              </div>

              {/* Circular price seal */}
              <div className="absolute -bottom-5 right-3 grid h-24 w-24 place-items-center rounded-full bg-brand-gradient text-white shadow-glow ring-[4px] ring-cream-fade sm:-bottom-8 sm:right-6 sm:h-32 sm:w-32 sm:ring-[6px]">
                {/* Dashed inner ring */}
                <svg
                  aria-hidden="true"
                  className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.6"
                    strokeDasharray="2 3"
                    opacity="0.45"
                  />
                </svg>
                <div className="relative text-center">
                  <p className="font-editorial text-[24px] font-bold italic leading-none sm:text-[32px]">
                    ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
                  </p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] opacity-95 sm:text-[9px]">
                    3-Day Live
                    <br />
                    Challenge
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Offer card */}
          <motion.div
            initial={initial}
            animate="visible"
            variants={visual}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[28px] bg-brand-cream p-6 shadow-card ring-1 ring-line sm:p-7 lg:p-9">
              {/* Subtle corner glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-rose blur-3xl opacity-60"
              />

              {/* Guarantee row */}
              <div className="relative flex items-start gap-4">
                <GuaranteeSeal />
                <p className="flex-1 text-[14px] leading-snug text-ink-soft sm:text-[15px]">
                  You&apos;ll feel less pain and more confidence by{' '}
                  <strong className="text-ink">Day 3</strong>, or we refund your{' '}
                  <strong className="text-ink">₹{CHECKOUT_CONFIG.amountRupeesNumeric} instantly</strong>.
                </p>
              </div>

              {/* Benefits checklist */}
              <ul className="relative mt-6 grid gap-2.5 border-t border-line/70 pt-6 sm:grid-cols-2 sm:gap-x-5">
                {BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-[13.5px] leading-snug text-ink-soft sm:text-[14.5px]"
                  >
                    <Check
                      weight="bold"
                      size={15}
                      className="mt-[3px] shrink-0 text-brand-deep"
                      aria-hidden="true"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Pricing */}
              <div className="relative mt-7 flex items-end justify-between gap-3 border-t border-line/70 pt-6">
                <div className="flex items-baseline gap-3">
                  <s className="text-lg text-ink-muted">₹{CHECKOUT_CONFIG.listPriceRupees}</s>
                  <span className="font-editorial text-[44px] font-extrabold leading-none text-ink sm:text-[56px]">
                    ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-deep">
                    Save
                  </p>
                  <p className="font-editorial text-xl font-bold text-brand-deep sm:text-2xl">
                    ₹{CHECKOUT_CONFIG.savingsRupees}
                  </p>
                </div>
              </div>

              {/* CTA */}
              <CheckoutLink
                href="/checkout"
                aria-label={`Get instant access to the 3-Day Prenatal Challenge for ₹${CHECKOUT_CONFIG.amountRupeesNumeric}`}
                className="group relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-deep px-6 py-4 font-heading text-base font-semibold text-white shadow-[0_18px_50px_-14px_rgba(146,68,83,0.55)] transition-all duration-300 hover:translate-y-[-1px] hover:bg-ink hover:shadow-[0_22px_55px_-12px_rgba(26,14,18,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-ring sm:text-[17px]"
              >
                <Lightning size={18} weight="fill" aria-hidden="true" />
                Get Instant Access · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </CheckoutLink>

              {/* Trust line - each fact is its own whitespace-nowrap chunk so
                  a single fact never breaks across two lines on narrow screens. */}
              <p className="relative mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft sm:text-[11px] sm:tracking-[0.16em]">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <ShieldCheck size={12} weight="bold" aria-hidden="true" />
                  100% Secure
                </span>
                <span aria-hidden="true" className="text-ink-muted">·</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarBlank size={12} weight="bold" aria-hidden="true" />
                  Starts {CHECKOUT_CONFIG.challenge.startDate}
                </span>
                <span aria-hidden="true" className="text-ink-muted">·</span>
                <span className="whitespace-nowrap">Limited Seats</span>
              </p>

              {/* Payment method logos */}
              <div className="relative mt-3">
                <PaymentLogos size="compact" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ────────────────── 4. Trust strip ──────────────────
         * Mobile: stars+rating sit on their own full-width row up top so
         *   the rating text never wraps mid-phrase ("…moms" used to drop
         *   onto a second line). The remaining 4 facts sit in a 2-col grid
         *   below, naturally aligned.
         * Sm+: flatten back to a single 5-col row. */}
        <motion.div
          variants={item}
          className="mt-12 border-t border-line/70 pt-8 lg:mt-16 lg:pt-10"
        >
          {(() => {
            const rating = TRUST.find((t) => t.kind === 'stars');
            const rest = TRUST.filter((t) => t.kind !== 'stars');
            return (
              <>
                {/* Mobile-only: rating row */}
                {rating && (
                  <div className="mb-4 flex justify-center sm:hidden">
                    <TrustItem item={rating} />
                  </div>
                )}
                {/* Mobile: 2-col grid for the 4 icon facts. Sm+: full 5-col row including rating. */}
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-5 sm:gap-x-6 lg:gap-x-8">
                  {/* Sm+: rating sits as first cell. Mobile: hidden here (rendered above). */}
                  {rating && (
                    <div className="hidden sm:flex sm:items-center sm:justify-center">
                      <TrustItem item={rating} />
                    </div>
                  )}
                  {rest.map((t) => (
                    <TrustItem key={t.label} item={t} />
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 *  Trust-strip item - single source of truth so the mobile rating row
 *  and the 2/5-col grid share identical content + sizing. `whitespace-
 *  nowrap` keeps each label on a single line at any cell width.
 * ─────────────────────────────────────────────────────────────────── */
function TrustItem({ item: t }: { item: TrustItem }) {
  return (
    <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink-soft sm:text-[14px]">
      {t.kind === 'stars' ? (
        <span className="flex shrink-0 gap-0.5" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} weight="fill" className="text-brand-deep" />
          ))}
        </span>
      ) : (
        <Icon3D name={t.icon3d} size={26} className="shrink-0" />
      )}
      <span>{t.label}</span>
    </div>
  );
}

function GuaranteeSeal() {
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-soft sm:h-[88px] sm:w-[88px]">
      {/* Dashed circle */}
      <svg
        aria-hidden="true"
        className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)]"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="white"
          strokeWidth="0.7"
          strokeDasharray="2 3"
          opacity="0.5"
        />
      </svg>
      <div className="relative text-center">
        <p className="font-editorial text-[20px] font-bold italic leading-none sm:text-[24px]">
          100%
        </p>
        <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.14em] opacity-95 sm:text-[8px]">
          Money Back
          <br />
          Guarantee
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 *  Marquee content group - rendered twice inside the track so the loop
 *  is seamless. The duplicate is `aria-hidden` so screen readers only
 *  hear one copy.
 * ─────────────────────────────────────────────────────────────────── */
function MarqueeGroup({
  price,
  listPrice,
  ariaHidden = false,
}: {
  price: number;
  listPrice: number;
  ariaHidden?: boolean;
}) {
  // Each repetition contains the two messages plus separator dots so the
  // strip reads as a continuous belt rather than a list of cards.
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-8 px-4 sm:gap-12 sm:px-8"
    >
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Gift size={14} weight="duotone" aria-hidden="true" />
        <span>
          <strong className="font-semibold">Special Offer:</strong>{' '}
          3-Day Prenatal Pain Relief &amp; Labor Prep Challenge for ₹{price}
        </span>
      </span>
      <Dot />
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Flame size={14} weight="duotone" aria-hidden="true" />
        <span>Price increases to ₹{listPrice} after this batch closes</span>
      </span>
      <Dot />
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <ShieldCheck size={14} weight="duotone" aria-hidden="true" />
        <span>100% Money-Back Guarantee</span>
      </span>
      <Dot />
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <CalendarBlank size={14} weight="duotone" aria-hidden="true" />
        <span>Live · Starts {CHECKOUT_CONFIG.challenge.startDate} · {CHECKOUT_CONFIG.challenge.timeSlots}</span>
      </span>
      <Dot />
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="block h-1 w-1 shrink-0 rounded-full bg-white/40"
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────
 *  Live dot - sits inline at the LEFT of the struggle pill copy.
 *  Uses inline-grid place-items-center so the dot and the ping share the
 *  exact same grid cell; the ping then scales from its own center, which
 *  IS the dot's center - no offset, regardless of inline baseline quirks.
 * ─────────────────────────────────────────────────────────────────── */
function LiveDot() {
  return (
    <span
      aria-label="Live"
      className="mr-2 inline-grid h-2 w-2 shrink-0 place-items-center align-middle"
      style={{ verticalAlign: 'middle' }}
    >
      <span
        aria-hidden="true"
        className="bw-live-ping col-start-1 row-start-1 inline-block h-2 w-2 rounded-full bg-brand"
      />
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 inline-block h-2 w-2 rounded-full bg-brand"
      />
    </span>
  );
}
