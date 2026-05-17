import Link from 'next/link';
import { Sparkle, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const BENEFITS = [
  'Less back & pelvic discomfort',
  'Reduced stiffness & heaviness',
  'Better movement & flexibility',
  'More confidence exercising safely',
  'Improved breathing awareness',
  'Calmer & more prepared for labor',
];

export default function FinalCTA() {
  return (
    <section data-final-cta className="relative overflow-hidden py-10 md:py-12 lg:py-14">
      {/* Gradient backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-brand-gradient"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.18)_0%,_transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      <div className="bw-wrap relative">
        <div className="mx-auto max-w-3xl text-center text-white">
          <div className="mx-auto inline-flex items-center gap-2 rounded-pill bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur ring-1 ring-white/20">
            <Sparkle weight="fill" size={14} aria-hidden="true" />
            Starts {CHECKOUT_CONFIG.challenge.startDate} · Live on Zoom
          </div>

          <h2 className="mt-5 font-heading text-[28px] font-extrabold leading-[1.06] text-white sm:text-[38px] lg:text-[46px]">
            Pregnancy doesn&apos;t need more fear.
            <br className="hidden sm:block" />{' '}
            <span className="text-white/85">It needs the right preparation.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-[15px] leading-relaxed text-white/90 sm:mt-5 sm:text-[16px]">
            Spend 3 days with a physiotherapist who actually understands the prenatal
            body — and feel the difference yourself, before committing to anything
            longer-term.
          </p>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-x-6 gap-y-2 text-left text-sm font-medium text-white/95 sm:grid-cols-2 sm:text-[15px]">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/checkout"
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-pill bg-white px-8 py-4 font-heading text-base font-bold text-brand-deep shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-10px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:text-[17px]"
              aria-label={`Get instant access to the ${CHECKOUT_CONFIG.challenge.days}-Day Prenatal Challenge for ₹${CHECKOUT_CONFIG.amountRupeesNumeric}`}
            >
              Get Instant Access · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <p className="text-center text-xs text-white/85 sm:text-sm">
              <ShieldCheck
                weight="fill"
                size={14}
                aria-hidden="true"
                className="mr-1.5 inline-block shrink-0 align-[-2px]"
              />
              100% Money-Back Guarantee · Refunded instantly if you don&apos;t love it.
              <br className="hidden sm:block" />
              Price increases to <s className="opacity-80">₹{CHECKOUT_CONFIG.listPriceRupees}</s> after this batch closes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
