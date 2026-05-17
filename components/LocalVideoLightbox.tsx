'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react/dist/ssr';

/* ──────────────────────────────────────────────────────────────────────
 *  <LocalVideoLightbox>
 *  Modal overlay that plays a local /public/ MP4 with controls.
 *  Opens when `src` is non-null. Closes on backdrop click, X button,
 *  or Escape key.
 *  Body scroll is locked while the modal is open.
 * ─────────────────────────────────────────────────────────────────── */

type Props = {
  src: string | null;
  onClose: () => void;
};

export default function LocalVideoLightbox({ src, onClose }: Props) {
  // Lock body scroll + listen for Escape while the modal is open.
  useEffect(() => {
    if (!src) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video testimonial"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
      >
        <X size={20} weight="bold" aria-hidden="true" />
      </button>

      {/* Stop click-propagation so clicking the video itself doesn't close. */}
      <div
        className="relative max-h-full w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={src}
          autoPlay
          controls
          playsInline
          preload="auto"
          className="h-auto w-full rounded-2xl bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
        />
      </div>
    </div>
  );
}
