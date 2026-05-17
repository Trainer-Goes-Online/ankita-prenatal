import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

type Pain = {
  imgSrc: string;
  highlight: string;
  rest: string;
};

const PAINS: Pain[] = [
  {
    imgSrc: '/transformations/s1.png',
    highlight: 'Back pain, pelvic pain, or stiffness',
    rest: 'is making everyday movement difficult.',
  },
  {
    imgSrc: '/transformations/s2.png',
    highlight: "You're scared",
    rest: 'of exercising and might harm your baby.',
  },
  {
    imgSrc: '/transformations/s3.png',
    highlight: 'You worry',
    rest: 'about labor, C-section, or not being prepared enough.',
  },
  {
    imgSrc: '/transformations/s4.png',
    highlight: 'You feel tired, swollen,',
    rest: 'and low on energy most days.',
  },
  {
    imgSrc: '/transformations/s5.png',
    highlight: "You're confused",
    rest: "by too much information and don't know what actually works.",
  },
];

export default function DoesThisSoundLikeYou() {
  return (
    <section className="relative bg-white py-14 md:py-20 lg:py-28">
      <div className="bw-wrap">
        <div className="mx-auto max-w-3xl text-center">
          <div className="bw-chip mx-auto mb-4">
            <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            A Quick Check-In
          </div>
          <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
            Does this sound like <span className="bw-gradient-text">you?</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink-soft sm:mt-5 sm:text-[16px]">
            Your body is preparing for birth — but is anyone preparing{' '}
            <strong className="text-ink">you</strong>? If any of these feel familiar,
            this challenge was built for moms exactly like you.
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-6 h-[3px] w-16 rounded-full bg-brand-gradient-x"
          />
        </div>

        {/* auto-rows-fr + items-stretch keeps every card the same height so
            tops align perfectly across the row, regardless of body copy length. */}
        <ul className="mt-10 grid auto-rows-fr items-stretch gap-4 sm:mt-12 sm:grid-cols-2 lg:mt-14 lg:grid-cols-5">
          {PAINS.map((p, i) => {
            const isLast = i === PAINS.length - 1;
            return (
              <li
                key={p.highlight}
                className={[
                  'group relative flex h-full flex-col items-center rounded-3xl border border-line bg-white p-5 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:p-6',
                  isLast ? 'sm:col-span-2 lg:col-span-1' : '',
                ].join(' ')}
              >
                <div className="relative mb-4 h-[112px] w-[112px] shrink-0 overflow-hidden rounded-full bg-brand-soft transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={p.imgSrc}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
                <p className="text-[15px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-brand-deep">{p.highlight}</span>{' '}
                  {p.rest}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-12 flex flex-col items-center gap-3 sm:mt-14">
          <Link
            href="/checkout"
            className="bw-cta w-full text-base sm:w-auto sm:text-[17px]"
            aria-label={`Get instant access to the 3-Day Prenatal Challenge for ₹${CHECKOUT_CONFIG.amountRupeesNumeric}`}
          >
            Get Instant Access · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
            <ArrowRight />
          </Link>
          <p className="text-center text-xs text-ink-muted sm:text-sm">
            <ShieldCheck
              size={14}
              weight="duotone"
              className="mr-1.5 inline-block shrink-0 align-[-2px] text-brand-deep"
              aria-hidden="true"
            />
            <span className="font-semibold text-ink-soft">100% Money-Back Guarantee</span>{' '}
            · Refundable instantly if you don&apos;t love it.
          </p>
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
