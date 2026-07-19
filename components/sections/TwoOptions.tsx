'use client';

import CheckoutLink from '@/components/CheckoutLink';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  X,
  Check,
  Warning,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const EASE_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_QUINT } },
};

const option1: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: EASE_QUINT, delay: 0.1 },
  },
};

const option2: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: EASE_QUINT, delay: 0.25 },
  },
};

const OPTION_1_PAINS = [
  'Avoid movement out of fear',
  'Keep struggling with back & pelvic pain',
  'Carry stiffness, pressure, and exhaustion',
  'Walk into labor anxious and unprepared',
];

const OPTION_2_GAINS = [
  'Learn safe, physio-led movement',
  'Calm pelvic & back pain in 3 days',
  'Master labor breathing with confidence',
  'Feel stronger and prepared for delivery',
];

export default function TwoOptions() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? 'visible' : 'hidden';

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24 lg:py-28">
      {/* Background blooms */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 right-1/3 h-[360px] w-[360px] rounded-full bg-brand-soft blur-[120px] opacity-40" />
      </div>

      <div className="bw-wrap relative">
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={container}
        >
          {/* Header */}
          <motion.div
            variants={headerItem}
            className="mb-5 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-deep"
          >
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
            <span>Let&apos;s be honest…</span>
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
          </motion.div>

          <motion.h2
            variants={headerItem}
            className="mx-auto max-w-3xl text-center font-editorial text-[32px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[44px] lg:text-[54px]"
          >
            Your pregnancy journey will go one of{' '}
            <span className="italic text-brand-deep">two ways</span> from here.
          </motion.h2>

          <motion.p
            variants={headerItem}
            className="mx-auto mt-5 max-w-3xl text-center text-[15px] leading-relaxed text-ink-soft sm:text-[16px]"
          >
            Both are valid. Only one will leave you feeling stronger walking
            into the delivery room.
          </motion.p>

          {/* Two cards */}
          <div className="mt-12 grid gap-5 sm:mt-14 md:grid-cols-2 md:gap-6 lg:gap-8">
            {/* ── OPTION 1 - muted, what happens if you don't act ── */}
            <motion.div variants={option1}>
              <article
                className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-cream-fade p-7 md:p-9"
              >
                {/* Subtle "x" pattern overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, #1A0E12 0, #1A0E12 1px, transparent 1px, transparent 14px)',
                  }}
                />

                <div className="relative flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-full bg-ink/8 text-ink-muted ring-1 ring-ink/10"
                  >
                    <X size={18} weight="bold" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">
                    Option 01
                  </span>
                </div>

                <h3 className="relative mt-5 font-editorial text-[24px] font-medium leading-[1.15] tracking-tight text-ink-soft sm:text-[28px]">
                  Keep doing what most pregnant moms do…
                </h3>

                <p className="relative mt-4 text-[14.5px] leading-relaxed text-ink-soft/85 sm:text-[15.5px]">
                  Follow random pregnancy advice from the internet, avoid
                  movement out of fear, and hope it gets better on its own.
                </p>

                <ul className="relative mt-6 space-y-3 border-t border-line/70 pt-6">
                  {OPTION_1_PAINS.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-soft/85 sm:text-[14.5px]"
                    >
                      <Warning
                        size={16}
                        weight="duotone"
                        className="mt-[2px] shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <p className="relative mt-7 text-[13px] italic text-ink-muted sm:text-[13.5px]">
                  The path most moms regret only after delivery.
                </p>
              </article>
            </motion.div>

            {/* ── OPTION 2 - vibrant, the right choice ── */}
            <motion.div variants={option2}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-brand-gradient p-7 text-white shadow-[0_30px_80px_-20px_rgba(146,68,83,0.45)] md:p-9">
                {/* Light wash */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      'radial-gradient(ellipse at 25% 15%, rgba(255,255,255,0.5) 0%, transparent 55%)',
                  }}
                />
                {/* Dot grain */}
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-15 mix-blend-overlay"
                  viewBox="0 0 400 500"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <pattern
                      id="two-opt-grain"
                      x="0"
                      y="0"
                      width="3"
                      height="3"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="0.5" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="400" height="500" fill="url(#two-opt-grain)" />
                </svg>

                <div className="relative flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white ring-1 ring-white/30 backdrop-blur"
                  >
                    <Check size={18} weight="bold" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/85">
                    Option 02 · Recommended
                  </span>
                </div>

                <h3 className="relative mt-5 font-editorial text-[24px] font-medium leading-[1.15] tracking-tight text-white sm:text-[28px]">
                  Join the 3-Day Prenatal Challenge.
                </h3>

                <p className="relative mt-4 text-[14.5px] leading-relaxed text-white/90 sm:text-[15.5px]">
                  Learn how to safely move, breathe, and prepare your body with{' '}
                  <strong className="text-white">physiotherapist-guided support</strong>{' '}
                  - so you feel stronger, more confident, and more prepared.
                </p>

                <ul className="relative mt-6 space-y-3 border-t border-white/20 pt-6">
                  {OPTION_2_GAINS.map((g) => (
                    <li
                      key={g}
                      className="flex items-start gap-2.5 text-[14px] leading-snug text-white/95 sm:text-[14.5px]"
                    >
                      <Sparkle
                        size={16}
                        weight="fill"
                        className="mt-[2px] shrink-0 text-white"
                        aria-hidden="true"
                      />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>

                <CheckoutLink
                  href="/checkout"
                  aria-label={`Get instant access to the 3-Day Prenatal Challenge for ₹${CHECKOUT_CONFIG.amountRupeesNumeric}`}
                  className="relative mt-7 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-white px-6 py-3.5 font-heading text-[14.5px] font-semibold text-brand-deep shadow-[0_14px_44px_-14px_rgba(255,255,255,0.55)] transition-all duration-300 hover:translate-y-[-1px] hover:shadow-[0_18px_50px_-12px_rgba(255,255,255,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:text-[15px]"
                >
                  Choose This Path · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </CheckoutLink>

                <p className="relative mt-3 text-center text-[11.5px] font-medium uppercase tracking-[0.16em] text-white/85">
                  100% money-back guarantee
                </p>
              </article>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
