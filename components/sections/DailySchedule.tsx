'use client';

import { useState } from 'react';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  Wind,
  Heartbeat,
  ShieldCheck,
  Clock,
  CaretDown,
  ArrowRight,
} from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/* ──────────────────────────────────────────────────────────────────────
 *  Motion - exponential ease (Impeccable). No springs.
 *  Pattern:
 *    Desktop = vertical tabs (left) + content panel (right).
 *      • Active tab has a `layoutId` background that morphs between tabs.
 *      • Content panel crossfades via AnimatePresence mode="wait".
 *    Mobile/Tablet = vertical accordion. One open at a time.
 *      • Height + opacity animate via AnimatePresence.
 * ─────────────────────────────────────────────────────────────────── */
const EASE_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const headerStack: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const headerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_QUINT } },
};

const tabListStack: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const tabItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_QUINT } },
};

const panelEnter: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, ease: EASE_QUINT, delay: 0.15 },
  },
};

type PhosphorIcon = typeof Wind;

type Day = {
  n: string;
  short: string;
  icon: PhosphorIcon;
  title: string;
  description: string;
  focus: string[];
  duration: string;
};

const DAYS: Day[] = [
  {
    n: '01',
    short: 'Pain Relief',
    icon: Heartbeat,
    title: 'Pregnancy Pain Relief + Safe Movement Foundations',
    description:
      'Learn breathing, posture correction, and gentle mobility exercises to help reduce back pain, pelvic discomfort, stiffness, and heaviness during pregnancy.',
    focus: ['Breathwork', 'Posture', 'Mobility'],
    duration: '45 min',
  },
  {
    n: '02',
    short: 'Pelvic Floor + Labor Prep',
    icon: ShieldCheck,
    title: 'Pelvic Floor + Labor Preparation Exercises',
    description:
      'Understand how to safely activate your deep core & pelvic floor, improve mobility, and practice labor preparation movements that support your body during delivery.',
    focus: ['Pelvic floor', 'Deep core', 'Labor prep'],
    duration: '45 min',
  },
  {
    n: '03',
    short: 'Labor Breathing + Breech',
    icon: Wind,
    title: "Labor Breathing + Breech Baby Guidance + Pregnancy Do's & Don'ts",
    description:
      'Learn contraction breathing, push breathing, movement strategies for pregnancy, physiotherapy guidance for breech baby positioning, and common mistakes to avoid during pregnancy.',
    focus: ['Breathing', 'Breech guidance', 'Daily habits'],
    duration: '45 min',
  },
];

const SLOTS = CHECKOUT_CONFIG.challenge.timeSlotList;

export default function DailySchedule() {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? 'visible' : 'hidden';

  const [activeIdx, setActiveIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [openMobile, setOpenMobile] = useState<number | null>(0);

  // Hover previews the day; click locks it in. When the cursor leaves
  // the tab column we fall back to the clicked-active state.
  const displayIdx = hoverIdx ?? activeIdx;
  const active = DAYS[displayIdx];

  return (
    <section
      id="schedule"
      className="relative overflow-hidden bg-cream-fade py-16 md:py-24 lg:py-32"
    >
      {/* Background blooms */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-brand-soft blur-[120px] opacity-60" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-brand-rose blur-[100px] opacity-50" />
      </div>

      <div className="bw-wrap relative">
        {/* ── Editorial header ── */}
        <motion.div
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={headerStack}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={headerItem}
            className="mb-5 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-deep"
          >
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
            <span>The 3-Day Challenge</span>
            <span aria-hidden="true" className="block h-px w-10 bg-brand-deep/70" />
          </motion.div>

          <motion.h2
            variants={headerItem}
            className="font-editorial text-[32px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[46px] lg:text-[58px]"
          >
            We&apos;ll cover your complete{' '}
            <span className="italic text-brand-deep">prenatal blueprint</span>{' '}
            in 3 days.
          </motion.h2>

          <motion.p
            variants={headerItem}
            className="mx-auto mt-5 max-w-3xl text-[15px] leading-relaxed text-ink-soft sm:text-[16px]"
          >
            Each day builds on the last. Tap a day to see exactly what you&apos;ll
            work on, live with Dr. Ankita.
          </motion.p>

          {/* Slot pills */}
          <motion.div
            variants={headerItem}
            className="mx-auto mt-8 flex flex-wrap justify-center gap-2"
          >
            {SLOTS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line-strong/60 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink shadow-soft"
              >
                <Clock
                  size={14}
                  weight="duotone"
                  className="text-brand-deep"
                  aria-hidden="true"
                />
                {s}
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  IST
                </span>
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ─────────────────────────────────────────────────────────────
         *  DESKTOP - Vertical tabs + content panel
         *  Active tab uses layoutId for the morphing pill background.
         *  Panel crossfades via AnimatePresence mode="wait".
         * ──────────────────────────────────────────────────────────── */}
        <LayoutGroup id="schedule-tabs">
          <div className="mt-14 hidden lg:block">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(280px,360px)_1fr]">
              {/* Tab list */}
              <motion.ul
                role="tablist"
                aria-label="3-day prenatal programme"
                initial={initial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={tabListStack}
                onMouseLeave={() => setHoverIdx(null)}
                className="flex flex-col gap-2 self-start"
              >
                {DAYS.map((d, i) => {
                  const isActive = i === displayIdx;
                  const isLocked = i === activeIdx;
                  return (
                    <motion.li key={d.n} variants={tabItem}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isLocked}
                        aria-controls={`day-panel-desktop-${d.n}`}
                        onClick={() => setActiveIdx(i)}
                        onMouseEnter={() => setHoverIdx(i)}
                        onFocus={() => setHoverIdx(i)}
                        className="group relative flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-white/40"
                      >
                        {/* Morphing active background - the signature animation */}
                        {isActive && (
                          <motion.span
                            layoutId="activeDayTabBg"
                            transition={{ duration: 0.55, ease: EASE_QUINT }}
                            className="absolute inset-0 -z-0 rounded-2xl bg-white shadow-card ring-1 ring-line"
                            aria-hidden="true"
                          />
                        )}

                        <span className="relative z-10 flex w-full items-center gap-4">
                          <span
                            className={[
                              'font-editorial text-[30px] font-medium leading-none transition-colors',
                              isActive ? 'text-brand-deep' : 'text-ink-muted/55',
                            ].join(' ')}
                          >
                            {d.n}
                          </span>

                          <span className="flex-1">
                            <span
                              className={[
                                'block text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
                                isActive ? 'text-brand-deep' : 'text-ink-muted',
                              ].join(' ')}
                            >
                              Day {d.n}
                            </span>
                            <span
                              className={[
                                'block font-heading text-[15px] font-semibold transition-colors',
                                isActive ? 'text-ink' : 'text-ink-soft',
                              ].join(' ')}
                            >
                              {d.short}
                            </span>
                          </span>

                          <ArrowRight
                            size={16}
                            weight="bold"
                            className={[
                              'shrink-0 transition-all duration-300',
                              isActive
                                ? 'translate-x-0 text-brand-deep opacity-100'
                                : '-translate-x-2 text-ink-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </motion.ul>

              {/* Content panel */}
              <motion.div
                initial={initial}
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={panelEnter}
                className="relative"
              >
                <AnimatePresence mode="wait">
                  <motion.article
                    key={displayIdx}
                    id={`day-panel-desktop-${active.n}`}
                    role="tabpanel"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: EASE_QUINT }}
                    className="relative overflow-hidden rounded-[28px] border border-line bg-white p-8 shadow-card md:p-10"
                  >
                    {/* Meta row top-right */}
                    <div className="absolute right-7 top-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-deep md:right-10 md:top-10">
                      <span
                        aria-hidden="true"
                        className="block h-px w-6 bg-brand-deep/70"
                      />
                      Live Session · {active.duration}
                    </div>

                    {/* Big icon + day number */}
                    <div className="flex items-end gap-5">
                      <div className="relative grid h-[72px] w-[72px] place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow">
                        <active.icon
                          size={32}
                          weight="duotone"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-deep">
                          Day
                        </p>
                        <p className="font-editorial text-[46px] font-medium leading-none text-ink">
                          {active.n}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-7 font-editorial text-[26px] font-medium leading-[1.1] tracking-tight text-ink md:text-[32px]">
                      {active.title}
                    </h3>

                    <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-soft md:text-[16.5px]">
                      {active.description}
                    </p>

                    {/* Focus pills */}
                    <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line/60 pt-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                        Focus
                      </span>
                      {active.focus.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center rounded-pill bg-brand-soft/80 px-3 py-1 text-[12px] font-medium text-brand-deep"
                        >
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* Progress dots - reflects whichever day is currently shown (hover or click) */}
                    <div className="absolute right-7 bottom-7 flex gap-1.5 md:right-10 md:bottom-10">
                      {DAYS.map((_, i) => (
                        <span
                          key={i}
                          aria-hidden="true"
                          className={[
                            'block h-1.5 rounded-full transition-all duration-500',
                            i === displayIdx
                              ? 'w-8 bg-brand-deep'
                              : 'w-1.5 bg-ink-muted/30',
                          ].join(' ')}
                        />
                      ))}
                    </div>
                  </motion.article>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </LayoutGroup>

        {/* ─────────────────────────────────────────────────────────────
         *  MOBILE + TABLET - Accordion (one open at a time)
         * ──────────────────────────────────────────────────────────── */}
        <motion.ol
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={tabListStack}
          className="mt-12 grid gap-3 lg:hidden"
        >
          {DAYS.map((d, i) => {
            const isOpen = openMobile === i;
            return (
              <motion.li key={d.n} variants={tabItem}>
                <article
                  className={[
                    'overflow-hidden rounded-2xl border bg-white transition-all duration-300',
                    isOpen
                      ? 'border-brand/40 shadow-card'
                      : 'border-line shadow-soft',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMobile(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`day-panel-mobile-${d.n}`}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <span
                      className={[
                        'grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors duration-300',
                        isOpen
                          ? 'bg-brand-gradient text-white shadow-soft'
                          : 'bg-brand-soft text-brand-deep',
                      ].join(' ')}
                    >
                      <d.icon size={22} weight="duotone" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      <span
                        className={[
                          'block text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
                          isOpen ? 'text-brand-deep' : 'text-ink-muted',
                        ].join(' ')}
                      >
                        Day {d.n}
                      </span>
                      <span className="block font-heading text-[15px] font-bold text-ink sm:text-[16px]">
                        {d.short}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={[
                        'grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300',
                        isOpen
                          ? 'rotate-180 border-brand-deep bg-brand-soft text-brand-deep'
                          : 'border-line-strong bg-white text-ink-soft',
                      ].join(' ')}
                    >
                      <CaretDown size={14} weight="bold" />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`day-panel-mobile-${d.n}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE_QUINT }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="border-t border-line/60 px-4 py-5 sm:px-5">
                          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-deep">
                            <span
                              aria-hidden="true"
                              className="block h-px w-5 bg-brand-deep/70"
                            />
                            Live Session · {d.duration}
                          </div>
                          <h3 className="font-editorial text-[20px] font-medium leading-snug tracking-tight text-ink sm:text-[22px]">
                            {d.title}
                          </h3>
                          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                            {d.description}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/40 pt-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                              Focus
                            </span>
                            {d.focus.map((f) => (
                              <span
                                key={f}
                                className="inline-flex items-center rounded-pill bg-brand-soft/80 px-2.5 py-1 text-[11.5px] font-medium text-brand-deep"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              </motion.li>
            );
          })}
        </motion.ol>

        {/* Footer note */}
        <motion.p
          initial={initial}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={headerItem}
          className="mx-auto mt-12 max-w-2xl text-center text-[13px] text-ink-muted sm:mt-16 sm:text-sm"
        >
          Attend whichever slot fits your schedule.
        </motion.p>
      </div>
    </section>
  );
}
