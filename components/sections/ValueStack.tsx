'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Lightning,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/* ──────────────────────────────────────────────────────────────────────
 *  Value-stack reinforcement section. Renders the inclusion list with
 *  individual prices summing to ₹10,000+, with the final ₹1 below.
 *
 *  Two visual variants share the same data:
 *    • variant="primary" - used mid-page after social proof.
 *      Heading: "GET INSTANT ACCESS TO Your 3-Day Prenatal Pain Relief &
 *      Labor Prep Experience"
 *    • variant="recap" - used near the bottom as a final close.
 *      Heading: "Recap of everything you'll get".
 * ─────────────────────────────────────────────────────────────────── */
const EASE_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_QUINT } },
};

type LineItem = { label: string; value: number };

const ITEMS: LineItem[] = [
  { label: '3-Day Prenatal Pain Relief & Labor Prep Challenge', value: 2700 },
  { label: 'Back Pain & Pelvic Discomfort Assessment', value: 1200 },
  { label: 'Natural Labor Preparation Exercise Protocol', value: 1800 },
  { label: 'Pregnancy Nutrition & Weight Management Guidelines', value: 1500 },
  { label: 'Physiotherapy Guidance for Breech Baby Position', value: 1700 },
  { label: 'Labor Breathing & Push Preparation Training', value: 1900 },
  { label: 'Safe Pregnancy Movement Starter Guide', value: 900 },
  { label: 'Daily Pregnancy Posture & Movement Corrections', value: 1000 },
];

const TOTAL_VALUE = 10000; // marketing total (matches PDF - sum of line items rounded)
const FINAL_PRICE = CHECKOUT_CONFIG.amountRupeesNumeric;

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

interface ValueStackProps {
  variant?: 'primary' | 'recap';
}

export default function ValueStack({ variant = 'primary' }: ValueStackProps) {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? 'visible' : 'hidden';

  const isPrimary = variant === 'primary';

  return (
    <section
      id={isPrimary ? 'value-stack' : 'recap'}
      className={[
        'relative overflow-hidden py-16 md:py-24 lg:py-28',
        isPrimary ? 'bg-white' : 'bg-cream-fade',
      ].join(' ')}
    >
      {/* Background blooms */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-brand-soft blur-[120px] opacity-50" />
        <div className="absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-brand-rose blur-[100px] opacity-50" />
      </div>

      <div className="bw-wrap relative">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={container}
          className="mx-auto max-w-3xl"
        >
          {/* Eyebrow + Headline */}
          <motion.div
            variants={item}
            className="mb-5 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-deep"
          >
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
            <span>{isPrimary ? 'Get Instant Access To' : 'Recap'}</span>
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
          </motion.div>

          <motion.h2
            variants={item}
            className="text-center font-editorial text-[32px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[44px] lg:text-[54px]"
          >
            {isPrimary ? (
              <>
                Your <span className="italic text-brand-deep">3-Day Prenatal Pain Relief & Labor Prep</span> Experience.
              </>
            ) : (
              <>
                Everything you&apos;ll get for{' '}
                <span className="italic text-brand-deep">₹{FINAL_PRICE}</span>.
              </>
            )}
          </motion.h2>

          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-xl text-center text-[14px] font-medium uppercase tracking-[0.16em] text-ink-soft sm:text-[15px]"
          >
            {isPrimary ? (
              <>Powered by the BodyWorx Prenatal Method™</>
            ) : (
              <>One-time payment · Lifetime access to materials</>
            )}
          </motion.p>

          {/* Line items card */}
          <motion.div
            variants={item}
            className="relative mt-10 overflow-hidden rounded-[28px] border border-line bg-white shadow-card sm:mt-12"
          >
            {/* Top brand stripe */}
            <div
              aria-hidden="true"
              className="h-1.5 w-full bg-brand-gradient-x"
            />

            <ul className="divide-y divide-line/70">
              {ITEMS.map((it, i) => (
                <li
                  key={it.label}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-soft/30 sm:gap-4 sm:px-7 sm:py-4"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-deep sm:h-8 sm:w-8 sm:text-[12px]"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[13.5px] leading-snug text-ink sm:text-[15px]">
                    {it.label}
                  </span>
                  <span className="shrink-0 text-right font-heading text-[14px] font-bold tabular-nums text-ink-soft sm:text-[16px]">
                    {formatINR(it.value)}
                  </span>
                </li>
              ))}

              {/* Total row */}
              <li className="flex items-center gap-3 bg-brand-soft/40 px-5 py-4 sm:gap-4 sm:px-7 sm:py-5">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-soft sm:h-8 sm:w-8"
                >
                  <Sparkle size={14} weight="fill" />
                </span>
                <span className="flex-1 text-[12px] font-bold uppercase tracking-[0.18em] text-brand-deep sm:text-[13px]">
                  Total real value
                </span>
                <span className="shrink-0 text-right font-editorial text-[20px] font-bold tabular-nums text-ink sm:text-[24px]">
                  <s className="opacity-60">{formatINR(TOTAL_VALUE)}+</s>
                </span>
              </li>
            </ul>

            {/* Final price block */}
            <div className="relative border-t border-line bg-cream-fade px-5 py-7 text-center sm:px-7 sm:py-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-deep">
                All for just
              </p>
              <p className="mt-2 flex items-baseline justify-center gap-3">
                <span className="font-editorial text-[56px] font-extrabold leading-none tracking-tight text-ink sm:text-[72px]">
                  ₹{FINAL_PRICE}
                </span>
                <span className="text-sm font-medium text-ink-muted sm:text-base">
                  one-time
                </span>
              </p>
              <p className="mt-2 text-[12px] italic text-ink-muted sm:text-[13px]">
                (Introductory price · increasing soon)
              </p>

              <Link
                href="/checkout"
                aria-label={`Get instant access to the 3-Day Prenatal Challenge for ₹${FINAL_PRICE}`}
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-deep px-6 py-4 font-heading text-[15px] font-semibold text-white shadow-[0_18px_50px_-14px_rgba(146,68,83,0.55)] transition-all duration-300 hover:translate-y-[-1px] hover:bg-ink hover:shadow-[0_22px_55px_-12px_rgba(26,14,18,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-ring sm:w-auto sm:text-[16px]"
              >
                <Lightning size={18} weight="fill" aria-hidden="true" />
                Get Instant Access · ₹{FINAL_PRICE}
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-soft sm:text-[11px]">
                100% Money-Back Guarantee
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
