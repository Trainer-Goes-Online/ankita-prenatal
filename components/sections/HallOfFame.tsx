'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

/* ──────────────────────────────────────────────────────────────────────
 *  Hall of Fame — two infinite marquees of client transformation photos.
 *  Row 1: t1–t17, scrolls left → right.
 *  Row 2: t18–t35, scrolls right → left.
 *  No dots, no arrows. Pure autoplay, slow + smooth (linear, ~80s/cycle).
 *  Seamless loop pattern: content is duplicated inside a `w-max` track,
 *  the track animates between 0% and -50%, landing exactly on its own
 *  duplicate so the seam is invisible.
 * ─────────────────────────────────────────────────────────────────── */

const ROW_1_IMAGES = Array.from(
  { length: 17 },
  (_, i) => `/transformations/t${i + 1}.png`,
);

const ROW_2_IMAGES = Array.from(
  { length: 18 },
  (_, i) => `/transformations/t${i + 18}.png`,
);

const ROW_DURATION_SECONDS = 80;

type MarqueeRowProps = {
  images: string[];
  direction: 'left' | 'right';
  reduce: boolean;
};

function MarqueeRow({ images, direction, reduce }: MarqueeRowProps) {
  // Duplicate so a -50% translate of the track lands on the duplicate.
  const track = [...images, ...images];

  // "left" = content moves leftward (track: 0% → -50%)
  // "right" = content moves rightward (track: -50% → 0%)
  const xKeyframes =
    direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'];

  return (
    <div className="relative overflow-hidden">
      {/* Edge fade so the seam never reads as a hard cut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#FFF7F8] to-transparent sm:w-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#FFF7F8] to-transparent sm:w-20"
      />

      <motion.div
        className="flex w-max gap-3 sm:gap-4"
        animate={reduce ? undefined : { x: xKeyframes }}
        transition={{
          duration: ROW_DURATION_SECONDS,
          ease: 'linear',
          repeat: Infinity,
          repeatType: 'loop',
        }}
        aria-hidden="true"
      >
        {track.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-[200px] w-[160px] shrink-0 overflow-hidden rounded-2xl bg-brand-soft ring-1 ring-line shadow-soft sm:h-[260px] sm:w-[208px] lg:h-[300px] lg:w-[240px]"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 208px, 240px"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function HallOfFame() {
  const prefersReducedMotion = useReducedMotion();
  const reduce = !!prefersReducedMotion;

  return (
    <section
      className="relative overflow-hidden bg-cream-fade py-16 sm:py-20 lg:py-24"
      aria-label="Client transformations"
    >
      <div className="bw-wrap relative z-10 mb-10 text-center sm:mb-12 lg:mb-14">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-soft sm:text-[11.5px]">
          Hall of Fame
        </p>
        <h2 className="mx-auto mt-3 max-w-4xl font-editorial text-[32px] font-medium leading-[1.05] tracking-[-0.01em] text-brand-deep sm:text-[44px] lg:text-[56px]">
          Real Results: 35+ Lives Transformed
        </h2>
      </div>

      <div className="flex flex-col gap-3 sm:gap-5">
        <MarqueeRow
          images={ROW_1_IMAGES}
          direction="right"
          reduce={reduce}
        />
        <MarqueeRow
          images={ROW_2_IMAGES}
          direction="left"
          reduce={reduce}
        />
      </div>
    </section>
  );
}
