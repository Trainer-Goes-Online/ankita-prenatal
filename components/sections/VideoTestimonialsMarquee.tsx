'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, Play } from '@phosphor-icons/react/dist/ssr';
import LocalVideoLightbox from '@/components/LocalVideoLightbox';

/* ──────────────────────────────────────────────────────────────────────
 *  "Hear from Our Moms" — 3 phone-styled video thumbnails.
 *  Each tile shows the first frame as a poster (no autoplay).
 *  Click → modal lightbox plays the video with native controls.
 *  Mobile: horizontal swipeable row. Desktop: centered row.
 * ─────────────────────────────────────────────────────────────────── */

const VIDEO_SOURCES = [
  '/transformations/v1.mp4',
  '/transformations/v2.mp4',
  '/transformations/v3.mp4',
];

/* ── Phone-styled clickable video thumbnail ──────────────────────────── */
function PhoneVideoThumbnail({
  src,
  onClick,
}: {
  src: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Play video testimonial"
      className="group relative h-[440px] w-[220px] shrink-0 overflow-hidden rounded-[36px] bg-ink p-1.5 shadow-card transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-ring sm:h-[500px] sm:w-[250px] sm:p-2"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-black">
        {/* Phone notch */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-ink sm:top-2.5 sm:h-5 sm:w-24"
        />

        {/* The video element itself is the poster.
            #t=0.1 fragment seeks to 0.1s so the first real frame paints
            (not the codec-black initial frame). Muted + playsInline +
            preload=metadata keeps it lightweight — no playback starts. */}
        <video
          src={`${src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="pointer-events-none h-full w-full object-cover"
        />

        {/* Dark gradient + play button overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
            <Play
              size={22}
              weight="fill"
              aria-hidden="true"
              className="translate-x-[2px]"
            />
          </span>
        </span>
      </div>
    </button>
  );
}

/* ── Section ─────────────────────────────────────────────────────────── */
export default function VideoTestimonialsMarquee() {
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Auto-advance the slider on mobile / tablet only (`< lg`). Desktop shows
  // all 3 cards centered so there's nothing to scroll. Pauses for ~4s when
  // the user touches the row so manual swipes don't fight the auto-scroll.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isDesktop || reduce) return;

    const track = trackRef.current;
    if (!track) return;

    let pauseUntil = 0;
    const STEP_MS = 3500;

    const tick = () => {
      if (Date.now() < pauseUntil) return;
      const firstCard = track.querySelector<HTMLElement>('[data-card]');
      if (!firstCard) return;

      // gap-4 = 16px on mobile, gap-6 = 24px on sm+. Read the computed gap
      // so we always advance by exactly one card-width without resize bugs.
      const gap = parseFloat(getComputedStyle(track).columnGap || '16') || 16;
      const cardWidth = firstCard.offsetWidth + gap;
      const maxScroll = track.scrollWidth - track.clientWidth;

      if (track.scrollLeft >= maxScroll - 4) {
        // Reached the end → smooth-scroll back to the start (loop).
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: cardWidth, behavior: 'smooth' });
      }
    };

    const onUserTouch = () => {
      pauseUntil = Date.now() + 4000;
    };

    const interval = window.setInterval(tick, STEP_MS);
    track.addEventListener('touchstart', onUserTouch, { passive: true });

    return () => {
      clearInterval(interval);
      track.removeEventListener('touchstart', onUserTouch);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-cream-fade py-16 sm:py-20 lg:py-24">
      <div className="bw-wrap relative z-10 mb-10 text-center sm:mb-12">
        <div className="bw-chip mx-auto mb-4">
          <Heart weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
          Hear from Our Moms
        </div>
        <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[44px]">
          Real stories,{' '}
          <span className="bw-gradient-text">in their own words.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] text-ink-muted sm:text-[15px]">
          Tap any video to hear it directly from her.
        </p>
      </div>

      {/* Mobile/tablet: horizontal auto-scrolling slider.
          Desktop (lg+): centered static row, all 3 cards visible. */}
      <div
        ref={trackRef}
        className="relative z-10 flex scroll-smooth gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden sm:gap-6 sm:px-6 lg:justify-center lg:overflow-x-visible lg:px-8"
      >
        {VIDEO_SOURCES.map((src) => (
          <div
            key={src}
            data-card
            className="shrink-0 [scroll-snap-align:start]"
          >
            <PhoneVideoThumbnail
              src={src}
              onClick={() => setOpenSrc(src)}
            />
          </div>
        ))}
      </div>

      {/* Lightbox — controlled by the click handlers on each phone tile */}
      <LocalVideoLightbox src={openSrc} onClose={() => setOpenSrc(null)} />
    </section>
  );
}
