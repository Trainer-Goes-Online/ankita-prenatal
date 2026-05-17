'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '#experience', label: 'What you get' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#method', label: 'Method' },
  { href: '#founder', label: 'Dr. Ankita' },
  { href: '#faq', label: 'FAQ' },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full transition-all',
        scrolled
          ? 'bg-white/85 backdrop-blur-md shadow-[0_1px_0_rgba(229,210,216,0.7)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="bw-wrap flex h-16 items-center justify-between md:h-[72px]">
        <Link
          href="/"
          aria-label="BodyWorx - go to home"
          className="flex items-center gap-2 font-heading text-[22px] font-extrabold tracking-tight text-ink"
        >
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white shadow-soft"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10-1.2.66-2.8.66-4 0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          BodyWorx
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-brand"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            className="hidden md:inline-flex bw-cta px-5 py-2.5 text-sm min-h-0"
          >
            Get Access · ₹1
            <ArrowRight />
          </Link>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-white text-ink md:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <div className="relative h-3 w-4">
              <span
                className={[
                  'absolute left-0 right-0 top-0 h-[2px] bg-current transition-all',
                  open ? 'translate-y-[5px] rotate-45' : '',
                ].join(' ')}
              />
              <span
                className={[
                  'absolute left-0 right-0 top-[5px] h-[2px] bg-current transition-opacity',
                  open ? 'opacity-0' : 'opacity-100',
                ].join(' ')}
              />
              <span
                className={[
                  'absolute left-0 right-0 top-[10px] h-[2px] bg-current transition-all',
                  open ? '-translate-y-[5px] -rotate-45' : '',
                ].join(' ')}
              />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <div className="bw-wrap flex flex-col gap-1 py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-ink-soft hover:bg-brand-soft hover:text-brand-deep"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/checkout"
              onClick={() => setOpen(false)}
              className="bw-cta mt-2"
            >
              Get Instant Access · ₹1
              <ArrowRight />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function ArrowRight() {
  return (
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
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
