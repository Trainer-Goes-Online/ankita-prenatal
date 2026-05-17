import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import CheckoutForm from '@/components/CheckoutForm';

export const metadata = {
  title: 'Checkout · 3-Day Prenatal Challenge | BodyWorx',
  description:
    'Complete your registration for the BodyWorx 3-Day Prenatal Pain Relief & Labor Prep Challenge.',
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-rose-radial">
      {/* Minimal page header - wordmark + back link (replaces removed navbar) */}
      <div className="bw-wrap flex items-center justify-between pt-5 sm:pt-7">
        <Link
          href="/"
          aria-label="Back to BodyWorx landing page"
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-white shadow-soft"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10-1.2.66-2.8.66-4 0Z" />
            </svg>
          </span>
          <span className="font-heading text-[15px] font-extrabold uppercase leading-none tracking-[0.18em] text-ink sm:text-base">
            Bodyworx
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-brand sm:text-sm"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Back
        </Link>
      </div>

      <section className="py-8 md:py-12 lg:py-16">
        <div className="bw-wrap">
          <CheckoutForm />
        </div>
      </section>
    </main>
  );
}
