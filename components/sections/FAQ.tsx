'use client';

import { useState } from 'react';
import { ChatCircleDots } from '@phosphor-icons/react/dist/ssr';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';

const FAQS = [
  {
    q: "I'm in my 1st / 2nd / 3rd trimester. Is this challenge safe for me?",
    a: 'Yes. Every session is designed to be safe across all three trimesters. Dr. Ankita gives clear modifications based on which trimester you\'re in and how your body is feeling that day. If you\'ve been cleared for low-impact movement by your OB-GYN, you\'re a good fit. If you have a high-risk pregnancy (placenta previa, preterm labor risk, severe hyperemesis), please consult your doctor first - we\'ll happily refund you if you decide it isn\'t the right time.',
  },
  {
    q: "I haven't exercised in years. Can I still join?",
    a: 'Absolutely - this challenge is built for women who are not currently exercising. Most participants are starting from zero. The foundation days focus on breathing, gentle mobility, and pelvic floor awareness - no jumping, no straining, no equipment. You move at your own pace and the live cues make sure your form stays safe.',
  },
  {
    q: "What if I can't attend the live sessions?",
    a: `No problem. With ${CHECKOUT_CONFIG.challenge.timeSlotList.length} daily slots (${CHECKOUT_CONFIG.challenge.timeSlots}), most moms find at least one that works. Replays are shared the same day in our private community so you can practice on your own schedule. The replay covers the same flow, breathing, and corrections - you're never left behind.`,
  },
  {
    q: 'What equipment do I need? Do I need a gym membership?',
    a: 'Nothing. No gym, no dumbbells, no equipment. A small clear space at home (about the size of a yoga mat), comfortable clothes, and a chair or wall for support is enough. If you have a yoga mat and a couple of pillows, even better - but nothing is required.',
  },
  {
    q: 'How is this different from prenatal yoga or generic pregnancy workouts on YouTube?',
    a: 'Two things. First, the method - Dr. Ankita is a women\'s health physiotherapist, not a generalist trainer. The sequencing (breathing → core/pelvic floor → mobility → labor prep → recovery) is built around how the prenatal body actually changes, not a one-size-fits-all flow. Second, the live correction - random YouTube routines can\'t see your posture or compensate for your trimester. Live cues catch the small alignment issues that often cause back, hip, or pelvic pain in the first place.',
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-white py-14 md:py-20 lg:py-28">
      <div className="bw-wrap">
        <div className="mx-auto max-w-3xl text-center">
          <div className="bw-chip mx-auto mb-4">
            <ChatCircleDots weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            Common Questions
          </div>
          <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
            Frequently asked, <span className="bw-gradient-text">honestly answered</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink-soft sm:mt-5 sm:text-[16px]">
            Still have a question? Email{' '}
            <a
              className="font-semibold text-brand hover:underline"
              href="mailto:Bodyworx.pfn@gmail.com"
            >
              Bodyworx.pfn@gmail.com
            </a>{' '}
            - we reply within a few hours.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:mt-12">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <li
                key={f.q}
                className={[
                  'overflow-hidden rounded-2xl border bg-white transition-all',
                  open
                    ? 'border-brand/40 shadow-card'
                    : 'border-line shadow-soft hover:border-line-strong',
                ].join(' ')}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex w-full items-start justify-between gap-3 px-5 py-5 text-left sm:gap-4 sm:px-7 sm:py-6"
                >
                  <span className="font-heading text-[15px] font-bold leading-snug text-ink sm:text-[17px]">
                    {f.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className={[
                      'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all',
                      open
                        ? 'rotate-45 border-brand bg-brand text-white'
                        : 'border-line-strong bg-white text-ink',
                    ].join(' ')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  hidden={!open}
                  className="px-5 pb-6 sm:px-7"
                >
                  <p className="text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
