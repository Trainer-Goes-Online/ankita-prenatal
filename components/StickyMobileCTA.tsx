'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

/**
 * Sticky footer CTA - visible on mobile, tablet, and desktop.
 * - Hidden until the user has scrolled past the hero (~480px).
 * - Hidden again once the FinalCTA section enters view (since it already
 *   shows a giant CTA - sticky overlay would be redundant + visually noisy).
 * - Hidden on /checkout and /thank-you so it doesn't compete with the form.
 */
export default function StickyMobileCTA() {
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [finalCtaInView, setFinalCtaInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Look for the FinalCTA - it lives at the bottom of the page. When it
    // enters the viewport, hide the sticky bar.
    const target = document.querySelector('[data-final-cta]');
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setFinalCtaInView(entry.isIntersecting),
      { rootMargin: '0px 0px -80px 0px', threshold: 0 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  const visible = scrolledPastHero && !finalCtaInView;

  return (
    <div
      aria-hidden={!visible}
      className={[
        'pointer-events-none fixed inset-x-0 bottom-0 z-40',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto border-t border-line bg-white/95 px-4 pt-3 pb-3 shadow-[0_-8px_24px_-12px_rgba(146,68,83,0.25)] backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-ink-muted md:justify-start md:text-[13px]">
            <ShieldCheck weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            <span>100% Money-Back Guarantee · Starts {CHECKOUT_CONFIG.challenge.startDate}</span>
          </div>
          <Link
            href="/checkout"
            className="bw-cta min-h-[52px] w-full text-[15px] md:w-auto md:min-w-[320px] md:text-[15.5px]"
            aria-label="Start your 3-day prenatal challenge - opens checkout"
          >
            Get Instant Access · ₹{CHECKOUT_CONFIG.amountRupeesNumeric}
            <ArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg
      width="17"
      height="17"
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
