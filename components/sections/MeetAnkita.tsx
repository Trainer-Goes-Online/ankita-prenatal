import CheckoutLink from '@/components/CheckoutLink';
import Image from 'next/image';
import {
  Stethoscope,
  Baby,
  BowlFood,
  Heart,
  Sparkle,
  Star,
} from '@phosphor-icons/react/dist/ssr';
import CountUp from '@/components/CountUp';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const CREDENTIALS: { icon: typeof Stethoscope; label: string }[] = [
  { icon: Stethoscope, label: "Women's Health Physiotherapist" },
  { icon: Baby, label: 'Prenatal & Postnatal Coach' },
  { icon: BowlFood, label: 'Certified Nutritionist' },
  { icon: Heart, label: 'Mom (she gets it)' },
];

type Stat = {
  end: number;
  decimals: number;
  suffix: string;
  label: string;
};

const STATS: Stat[] = [
  { end: 12, decimals: 0, suffix: '+', label: 'Years in women’s health physio' },
  { end: 5000, decimals: 0, suffix: '+', label: 'Pregnant moms guided' },
  { end: 4.9, decimals: 1, suffix: '/5', label: 'Rated by participants' },
];

export default function MeetAnkita() {
  return (
    <section id="founder" className="relative overflow-hidden bg-white py-14 md:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-soft opacity-50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-brand-rose opacity-50 blur-3xl"
      />

      <div className="bw-wrap relative">
        <div className="mb-8 flex justify-center sm:mb-10">
          <div className="bw-chip">
            <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            Meet Your Coach
          </div>
        </div>

        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* LEFT - Real founder portrait + nameplate + credentials card BELOW
              the image (no overlap with the photo, no awkward inset cropping). */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-card">
              {/* Main portrait: hexagon-wall photo (warm, on-brand). */}
              <Image
                src="/team/dr-ankita-2.jpg"
                alt="Dr. Ankita, women's health physiotherapist"
                fill
                priority
                sizes="(min-width: 1024px) 440px, (min-width: 640px) 440px, 92vw"
                className="object-cover object-[50%_30%]"
              />

              {/* Soft bottom gradient so the nameplate stays legible over any
                  background tone within the photo. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/15 to-transparent"
              />

              {/* Name plate, bottom-left of the photo */}
              <div className="absolute inset-x-5 bottom-5">
                <p className="font-heading text-2xl font-extrabold leading-tight text-white drop-shadow-md">
                  Dr. Ankita
                </p>
                <p className="mt-1 text-[12.5px] font-medium text-white/95 drop-shadow">
                  Women&apos;s Health Physiotherapist · Prenatal Coach
                </p>
              </div>

              {/* Top-left floating chip */}
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-brand-deep shadow-soft backdrop-blur">
                <Sparkle weight="fill" size={12} aria-hidden="true" className="text-brand-deep" />
                12+ years experience
              </div>

              {/* Top-right rating chip */}
              <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-soft backdrop-blur">
                <Star weight="fill" size={12} aria-hidden="true" className="text-brand-deep" />
                4.9 / 5
              </div>
            </div>

            {/* Credentials card - now sits cleanly BELOW the photo, no overlap. */}
            <div className="mt-5 rounded-2xl border border-line bg-white p-4 shadow-card sm:mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-deep">
                Credentials
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {CREDENTIALS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <li
                      key={c.label}
                      className="flex items-center gap-2 text-[13px] leading-snug text-ink-soft"
                    >
                      <Icon
                        weight="duotone"
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 text-brand-deep"
                      />
                      <span>{c.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* RIGHT - bio */}
          <div>
            <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
              Why hundreds of pregnant moms{' '}
              <span className="bw-gradient-text">trust Dr. Ankita</span>
            </h2>

            <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-soft sm:text-base">
              <p>
                Women&apos;s health physiotherapist, prenatal coach, and mom -
                with <strong className="text-ink">12+ years</strong> guiding
                pregnant women through safer movement, less pain, and stronger
                labor prep.
              </p>
              <p>
                Too many moms are told to <em className="not-italic font-semibold text-ink">&ldquo;just rest&rdquo;</em>{' '}
                while their pain and fear quietly grow. The truth no one teaches
                them?{' '}
                <strong className="text-ink">
                  Your body can be prepared for birth - properly.
                </strong>
              </p>
            </div>

            <blockquote className="mt-6 rounded-2xl border-l-4 border-brand bg-brand-soft/50 p-5">
              <p className="font-heading text-lg font-bold leading-snug text-ink sm:text-xl">
                &ldquo;Pregnancy doesn&apos;t need more fear or random advice.{' '}
                <span className="bw-gradient-text">
                  It needs the right movement, breathing, and support - at the right time.
                </span>
                &rdquo;
              </p>
              <footer className="mt-3 text-sm font-medium text-ink-soft">
                - Dr. Ankita, Founder, BodyWorx
              </footer>
            </blockquote>

            <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft sm:text-base">
              That&apos;s why she built the{' '}
              <strong className="text-ink">3-Day Prenatal Challenge</strong> -
              feel the method first, decide only after.
            </p>

            {/* Stats strip - counts up from 0 once they scroll into view */}
            <ul className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
              {STATS.map((s) => (
                <li
                  key={s.label}
                  className="rounded-2xl border border-line bg-white p-4 text-center shadow-soft"
                >
                  <CountUp
                    end={s.end}
                    decimals={s.decimals}
                    suffix={s.suffix}
                    className="font-heading text-2xl font-extrabold tabular-nums text-ink sm:text-3xl"
                  />
                  <p className="mt-1 text-[11.5px] leading-tight text-ink-muted sm:text-xs">
                    {s.label}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <CheckoutLink
                href="/checkout"
                className="bw-cta w-full text-base sm:w-auto sm:text-[17px]"
                aria-label={`Get instant access to Dr. Ankita's 3-Day Prenatal Challenge for ₹${CHECKOUT_CONFIG.amountRupeesNumeric}`}
              >
                Get Instant Access · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
                <ArrowRight />
              </CheckoutLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
