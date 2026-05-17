'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Star, Quotes } from '@phosphor-icons/react/dist/ssr';

/* ──────────────────────────────────────────────────────────────────────
 *  "Why Pregnant Moms Across India Trust BodyWorx"
 *  Continuous auto-playing marquee of long-form text testimonials.
 *  No arrows, no dots. Single seamless loop on all viewports
 *  (mobile, tablet, desktop). Halts under prefers-reduced-motion.
 * ─────────────────────────────────────────────────────────────────── */

type Review = { quote: string; author: string; role: string };

const REVIEWS: Review[] = [
  {
    quote:
      '"When she was just two months pregnant, she began her journey with me. Despite being told to rest because of a low-lying placenta, her determination never wavered. Week by week, with guided exercises and mindful care, we prepared her body and mind. And in the seventh month, when her baby was breech, we didn\'t give up. With focus, with strength, and with each breath, she brought her baby into the world — vaginally, naturally, beautifully."',
    author: 'A Mother\'s Journey',
    role: 'Shared by Dr. Ankita',
  },
  {
    quote:
      '"Last night I delivered a healthy baby girl via vaginal delivery. When I first started your prenatal workouts, I wasn\'t sure what to expect. I had so many fears, but from the very first session, your knowledge, encouragement, and positivity reassured me. Every squat, every stepper, every pose, stretch, and breathwork session made me feel more prepared for labor. You called me on Saturday to share your experience about active labor — \'Trust your body, breathe, and stay strong.\' That\'s exactly what I did."',
    author: 'Smitha & Pram',
    role: 'Vaginal Delivery',
  },
  {
    quote:
      '"Blessed with a baby boy yesterday morning. I had never exercised in my whole life, but you made me believe I could do it, even during pregnancy. I still can\'t believe I was lifting 10 kg weights till my 9th month under your guidance — and the result? A normal delivery with no complications. Doctors had earlier told me my baby was in breech position and there was a chance I might end up with a C-section. But with your diet plan, exercises, breathing techniques, and constant support, I recovered so much. The biggest surprise — my back pain completely disappeared within a month."',
    author: 'Bindra & Preet',
    role: 'Normal Delivery · Breech baby flipped',
  },
  {
    quote:
      '"Four years ago, Yashashwini walked into my studio — curious, determined, and ready to build strength. When she discovered she was pregnant, she returned to us with a deeper purpose. We built a weekly plan, four to five days a week — lifting weights, guided by science, under my watchful eye. Every movement was safe, every breath intentional. Her baby settled in a perfect head-down position. Late one night past 11:30 p.m., she called me from the hospital. In that active labor phase, we guided her — live exercises, breathing cues, all through the night. By morning, she gave birth to a healthy baby, naturally, with strength and grace."',
    author: 'Yashashwini\'s Birth Story',
    role: 'Shared by Dr. Ankita',
  },
];

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex w-[300px] shrink-0 flex-col rounded-xl bg-slate-50 p-6 shadow-soft ring-1 ring-line/60 sm:w-[380px] lg:w-[420px]">
      <Quotes
        weight="fill"
        size={22}
        aria-hidden="true"
        className="text-brand-deep/70"
      />

      <div className="mt-3 flex gap-0.5" aria-label="Rated 5 out of 5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            weight="fill"
            aria-hidden="true"
            className="text-brand-deep"
          />
        ))}
      </div>

      <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-soft sm:text-[14.5px]">
        {review.quote}
      </p>

      <div className="mt-5 border-t border-line/70 pt-4">
        <p className="font-heading text-[14px] font-bold text-ink">
          {review.author}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{review.role}</p>
      </div>
    </article>
  );
}

function ReviewMarquee() {
  const reduce = useReducedMotion();
  // Duplicate so a -50% translate lands exactly on the duplicate copy →
  // seamless loop with no visible seam.
  const track = [...REVIEWS, ...REVIEWS];

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex w-max items-stretch gap-4 sm:gap-5"
        animate={reduce ? undefined : { x: ['0%', '-50%'] }}
        transition={{
          duration: 70,
          ease: 'linear',
          repeat: Infinity,
          repeatType: 'loop',
        }}
        aria-hidden="true"
      >
        {track.map((review, i) => (
          <ReviewCard key={`${review.author}-${i}`} review={review} />
        ))}
      </motion.div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-cream-fade py-14 md:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-brand-rose blur-3xl opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-brand-soft blur-3xl opacity-60"
      />

      <div className="bw-wrap relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="bw-chip mx-auto mb-4">
            <Star weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            Rated 4.9 / 5 by Pregnant &amp; Postpartum Moms
          </div>
          <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
            Why Pregnant Moms Across India{' '}
            <span className="bw-gradient-text">Trust BodyWorx</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink-soft sm:mt-5 sm:text-[16px]">
            Real moms. Real pregnancies. Real changes — in 3 days or less.
          </p>
        </div>
      </div>

      <div className="relative mt-10 sm:mt-12 lg:mt-14">
        <ReviewMarquee />
      </div>

      <div className="bw-wrap relative">
        <p className="mt-10 text-center text-xs text-ink-muted sm:text-sm">
          Testimonials reflect participant experiences. Results vary based on
          individual health and trimester.
        </p>
      </div>
    </section>
  );
}
