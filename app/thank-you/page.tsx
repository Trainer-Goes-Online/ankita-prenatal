'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Confetti,
  Sparkle,
  CalendarBlank,
  VideoCamera,
  Clock,
  Envelope,
  ChatCircleDots,
  Flower,
  Heart,
  Barbell,
  Wind,
  ShieldCheck,
  NotePencil,
  WhatsappLogo,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import { trackPurchaseComplete } from '@/lib/analytics';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

// The WhatsApp community invite rotates every ~2 weeks, so it lives in an env
// var instead of being hardcoded. NEXT_PUBLIC_ prefix is required because this
// page is a client component. Update NEXT_PUBLIC_WHATSAPP_INVITE_URL in
// .env.local (and in Vercel env) whenever the invite link changes.
const WHATSAPP_INVITE =
  process.env.NEXT_PUBLIC_WHATSAPP_INVITE_URL ||
  'https://chat.whatsapp.com/REPLACE_WITH_INVITE_CODE';

export default function ThankYouPage() {
  return (
    <Suspense fallback={<ThankYouSkeleton />}>
      <ThankYouContent />
    </Suspense>
  );
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const firedRef = useRef(false);

  const amountParam = searchParams.get('amt');
  const amount = amountParam === null ? CHECKOUT_CONFIG.amountRupeesNumeric : Number(amountParam);
  const currency = searchParams.get('cur') || CHECKOUT_CONFIG.currency;
  const funnel = searchParams.get('funnel') ?? CHECKOUT_CONFIG.funnelSlug;
  const isFreeRegistration = searchParams.get('free') === '1' || amount === 0;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackPurchaseComplete({
      paymentId: `landing_${Date.now()}`,
      value: amount,
      currency,
    });
  }, [amount, currency]);

  return (
    <main className="min-h-screen bg-rose-radial">
      {/* Welcome marquee */}
      <div className="bg-brand-gradient-x py-2.5 text-center text-xs font-semibold text-white sm:text-sm">
        <div className="bw-wrap flex flex-wrap items-center justify-center gap-2">
          <Confetti weight="fill" size={14} aria-hidden="true" />
          You&apos;re in. Welcome to the BodyWorx Prenatal family.
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            Day 1 begins <strong>{CHECKOUT_CONFIG.challenge.startDate}</strong>
          </span>
        </div>
      </div>

      {/* Confirmation hero */}
      <section className="relative overflow-hidden py-12 md:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[900px] -translate-x-1/2 rounded-full bg-brand-soft opacity-60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 left-10 h-60 w-60 rounded-full bg-brand-rose opacity-50 blur-3xl"
        />

        <div className="bw-wrap relative text-center">
          {/* Animated tick */}
          <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28">
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulseRing rounded-full bg-brand-gradient"
            />
            <div className="relative grid h-full w-full place-items-center rounded-full bg-brand-gradient shadow-glow">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          <div className="bw-chip mx-auto mt-6">
            <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            {isFreeRegistration ? 'Free Registration Confirmed' : 'Payment Confirmed'}
          </div>

          <h1 className="mt-4 font-heading text-[34px] font-extrabold leading-[1.06] text-ink sm:text-[48px] lg:text-[60px]">
            You&apos;re in.{' '}
            <span className="bw-gradient-text">See you on {CHECKOUT_CONFIG.challenge.startDate}.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            {isFreeRegistration ? (
              <>
                Your <strong className="text-ink">free registration</strong> is confirmed
                and you&apos;re officially in for the BodyWorx {CHECKOUT_CONFIG.challenge.days}-Day Prenatal Challenge.
                Check your inbox (and spam, just in case) for your confirmation email
                in the next few minutes.
              </>
            ) : (
              <>
                Your payment of <strong className="text-ink">₹{amount}</strong> is
                confirmed and you&apos;re officially registered for the BodyWorx 3-Day
                Prenatal Challenge. Check your inbox (and spam, just in case) for your
                receipt in the next few minutes.
              </>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1.5 shadow-soft ring-1 ring-line">
              <CalendarBlank weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              <strong className="text-ink">{CHECKOUT_CONFIG.challenge.startDate}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1.5 shadow-soft ring-1 ring-line">
              <VideoCamera weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              Live on Zoom
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1.5 shadow-soft ring-1 ring-line">
              <Clock weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              {CHECKOUT_CONFIG.challenge.timeSlots}
            </span>
          </div>
        </div>
      </section>

      {/* ── WhatsApp Community CTA — the most important next action ─────── */}
      <section className="pb-4 md:pb-8">
        <div className="bw-wrap">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl shadow-card">
            <div
              className="relative p-6 sm:p-8 md:p-10"
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              }}
            >
              {/* Soft inner glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/15 blur-3xl"
              />

              <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur ring-1 ring-white/25">
                    <Warning weight="fill" size={12} aria-hidden="true" />
                    Action Required · Step 1
                  </div>
                  <h2 className="mt-3 font-heading text-[22px] font-extrabold leading-tight text-white sm:text-[26px] md:text-[30px]">
                    Join the private WhatsApp community now.
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
                    This is where you&apos;ll get your Zoom links, daily reminders,
                    replay shares, and Q&amp;A access with Dr. Ankita.{' '}
                    <strong className="text-white">
                      Without joining, you won&apos;t receive Day 1 access details.
                    </strong>
                  </p>

                  <ul className="mt-4 grid gap-1.5 text-[13.5px] text-white/95 sm:grid-cols-2">
                    {[
                      'Daily Zoom links',
                      'Same-day replays',
                      'Live Q&A with Dr. Ankita',
                      'Peer support from other moms',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="mt-[3px] shrink-0"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={WHATSAPP_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-pill bg-white px-6 py-4 font-heading text-[15px] font-bold shadow-lg transition-transform duration-200 hover:-translate-y-0.5 sm:text-[16px] md:self-center md:px-7"
                  style={{ color: '#128C7E' }}
                  aria-label="Join the BodyWorx WhatsApp community"
                >
                  <WhatsappLogo weight="fill" size={20} aria-hidden="true" />
                  Join Community
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal note from Dr. Ankita */}
      <section className="pb-4 md:pb-8">
        <div className="bw-wrap">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line md:p-8">
            <div className="flex items-start gap-4">
              <div
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-gradient font-heading text-base font-extrabold text-white shadow-soft md:h-14 md:w-14 md:text-lg"
              >
                A
              </div>
              <div>
                <p className="font-heading text-base font-bold text-ink md:text-lg">
                  A quick note from Dr. Ankita
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Thank you for trusting me with these 3 days. I&apos;ve seen too many
                  pregnant moms told to &ldquo;just rest&rdquo; while their pain and
                  fear quietly get louder — that&apos;s why we built this. Come as you
                  are on Day 1. We&apos;ll handle the rest, together.
                </p>
                <p className="mt-3 font-heading text-sm font-semibold text-brand-deep">
                  — Dr. Ankita, Women&apos;s Health Physiotherapist
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps timeline */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="bw-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <div className="bw-chip mx-auto mb-3">
              <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              What Happens Next
            </div>
            <h2 className="font-heading text-[26px] font-extrabold leading-tight text-ink sm:text-[34px] lg:text-[40px]">
              Your <span className="bw-gradient-text">next steps</span>
            </h2>
            <p className="mt-3 text-base text-ink-soft sm:text-lg">
              Here&apos;s exactly what to expect over the next few days.
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-3xl gap-4">
            {NEXT_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
              <li
                key={step.title}
                className="group grid grid-cols-[auto_1fr] items-start gap-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-card sm:gap-5 sm:p-6"
              >
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft sm:h-16 sm:w-16">
                  <Icon weight="duotone" size={30} aria-hidden="true" className="text-brand-deep" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-gradient text-[10px] font-bold text-white shadow-soft"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-ink sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">
                    {step.description}
                  </p>
                </div>
              </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Your 3-Day Journey preview */}
      <section className="bg-cream-fade py-12 md:py-16 lg:py-20">
        <div className="bw-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <div className="bw-chip mx-auto mb-3">
              <Flower weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              A Sneak Peek
            </div>
            <h2 className="font-heading text-[24px] font-extrabold leading-tight text-ink sm:text-[30px] lg:text-[36px]">
              Your <span className="bw-gradient-text">{CHECKOUT_CONFIG.challenge.days}-day journey</span>
            </h2>
            <p className="mt-3 text-base text-ink-soft sm:text-lg">
              Here&apos;s what we&apos;ll work on together. Each day builds on the last.
            </p>
          </div>

          <ol className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {DAY_PREVIEW.map((d, i) => {
              const Icon = d.icon;
              return (
              <li
                key={d.title}
                className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-line"
              >
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-bold uppercase tracking-[0.14em] text-brand-deep">
                    Day
                  </span>
                  <span className="font-heading text-2xl font-extrabold text-ink">
                    0{i + 1}
                  </span>
                  <Icon weight="duotone" size={20} aria-hidden="true" className="ml-auto text-brand-deep" />
                </div>
                <h3 className="mt-3 font-heading text-[15px] font-bold leading-snug text-ink">
                  {d.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                  {d.short}
                </p>
              </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Before Day 1 prep */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="bw-wrap">
          <div className="mx-auto max-w-2xl text-center">
            <div className="bw-chip mx-auto mb-3">
              <NotePencil weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              Before Day 1
            </div>
            <h2 className="font-heading text-[24px] font-extrabold leading-tight text-ink sm:text-[30px] lg:text-[36px]">
              Three small things to{' '}
              <span className="bw-gradient-text">do before we start</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PREP_CARDS.map((card, i) => (
              <article
                key={card.title}
                className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-line transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-deep">
                  Step {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-heading text-lg font-bold text-ink">
                  {card.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee + contact */}
      <section className="bg-cream-fade py-12 md:py-16 lg:py-20">
        <div className="bw-wrap">
          <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl bg-white p-7 shadow-card ring-1 ring-line">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft"
                >
                  <ShieldCheck weight="fill" size={20} className="text-brand-deep" />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink">
                    Your{' '}
                    <em className="not-italic text-brand">100% money-back guarantee</em>
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                    Don&apos;t love the challenge? Email us within 7 days and we&apos;ll
                    refund your ₹{CHECKOUT_CONFIG.amountRupeesNumeric} instantly — no
                    questions, no forms, no waiting.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-ink p-7 text-white shadow-card">
              <h3 className="font-heading text-lg font-bold">Need a hand?</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/80">
                We reply to every message within a few hours, IST business hours.
              </p>
              <a
                href="mailto:Bodyworx.pfn@gmail.com"
                className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
              >
                <Envelope weight="fill" size={14} aria-hidden="true" />
                Bodyworx.pfn@gmail.com
              </a>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <Link href="/" className="bw-cta-ghost inline-flex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Back to landing page
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-white py-8 text-center text-xs text-ink-muted">
        <div className="bw-wrap">
          © {new Date().getFullYear()} BodyWorx · Dr. Ankita · A TrainerGoesOnline
          initiative
          <span className="hidden sm:inline"> · funnel: {funnel}</span>
        </div>
      </footer>
    </main>
  );
}

function ThankYouSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center bg-rose-radial">
      <div className="text-center text-ink-soft">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm">Loading your confirmation…</p>
      </div>
    </main>
  );
}

const NEXT_STEPS: { icon: typeof Envelope; title: string; description: string }[] = [
  {
    icon: Envelope,
    title: 'Confirmation email in your inbox',
    description:
      'Within the next 5 minutes — your receipt plus a link to join the private community where we share Zoom links, replays, and day-of reminders.',
  },
  {
    icon: ChatCircleDots,
    title: 'WhatsApp community — join above ↑',
    description:
      'A small, moderated group of pregnant moms doing the challenge alongside you. This is where Zoom links, daily reminders, and replays are shared — make sure you tap the green button above to join.',
  },
  {
    icon: CalendarBlank,
    title: 'Calendar invite for Day 1',
    description:
      `A calendar invite with all four daily Zoom slots will be sent 48 hours before ${CHECKOUT_CONFIG.challenge.startDate}. Add the slot that works best for you (or attend multiple).`,
  },
  {
    icon: Flower,
    title: `Day 1 begins · ${CHECKOUT_CONFIG.challenge.startDate}`,
    description:
      "We open with Pregnancy Pain Relief + Safe Movement Foundations. Wear comfortable clothes, have water and a chair nearby, and we'll do the rest.",
  },
];

const DAY_PREVIEW: { icon: typeof Heart; title: string; short: string }[] = [
  {
    icon: Heart,
    title: 'Pain Relief + Safe Movement',
    short:
      'Breathing, posture correction, and gentle mobility to ease back & pelvic discomfort.',
  },
  {
    icon: Barbell,
    title: 'Pelvic Floor + Labor Prep',
    short:
      'Activate deep core and pelvic floor, plus labor preparation movements.',
  },
  {
    icon: Wind,
    title: 'Labor Breathing + Breech Guidance',
    short:
      "Contraction breathing, breech baby positioning, and pregnancy do's & don'ts.",
  },
];

const PREP_CARDS = [
  {
    title: 'Set up your space',
    description:
      'A small clear area (yoga-mat sized) with a sturdy chair or wall nearby and water within reach. No gym, no equipment.',
  },
  {
    title: 'Quick chat with your OB-GYN',
    description:
      'If your pregnancy is high-risk or your doctor has flagged any movement restrictions, a quick confirmation that low-impact prenatal exercise is okay is all you need.',
  },
  {
    title: 'Note where you feel it most',
    description:
      'Jot down the top 1–2 pain points or worries you want to address — lower back, hips, pelvic floor, labor anxiety. Dr. Ankita will reference them across the 3 days.',
  },
];
