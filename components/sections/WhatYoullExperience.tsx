import {
  Stethoscope,
  HouseLine,
  Wind,
  PersonSimpleRun,
  Sparkle,
  ChalkboardTeacher,
} from '@phosphor-icons/react/dist/ssr';

const FEATURES: { icon: typeof Stethoscope; title: string; description: string }[] = [
  {
    icon: Stethoscope,
    title: 'Live Physio-Led Prenatal Sessions',
    description:
      'Safe, guided live sessions with Dr. Ankita & team designed specifically for pregnant moms.',

  },
  {
    icon: HouseLine,
    title: 'Safe, Pregnancy-Friendly Movements',
    description:
      'Gentle exercises to reduce back pain, stiffness, and pelvic discomfort safely.',
  },
  {
    icon: Wind,
    title: 'Labor Breathing & Pelvic Floor Prep',
    description:
      'Learn breathing and movement techniques to feel calmer and more prepared for labor.',
  },
  {
    icon: PersonSimpleRun,
    title: 'Posture & Daily Movement Corrections',
    description:
      'Fix daily habits that increase pressure, pain, and fatigue during pregnancy.',
  },
  {
    icon: Sparkle,
    title: 'Feel Stronger, Lighter & More Supported',
    description:
      'Move with better energy, less heaviness, and more confidence during pregnancy.',
  },
  {
    icon: ChalkboardTeacher,
    title: 'Live Guidance & Form Corrections',
    description:
      "Get real-time physiotherapist support so you move safely and correctly.",
  },
];

export default function WhatYoullExperience() {
  return (
    <section id="experience" className="relative bg-white py-14 md:py-20 lg:py-28">
      <div className="bw-wrap">
        <div className="mx-auto max-w-3xl text-center">
          <div className="bw-chip mx-auto mb-4">
            <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            What You&apos;ll Experience
          </div>
          <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
            Here&apos;s What You&apos;ll{' '}
            <span className="bw-gradient-text">Experience in 3 Days</span>
          </h2>
          <p className="mt-4 text-[15px] text-ink-soft sm:mt-5 sm:text-[16px]">
            A simple, live prenatal preparation experience — so you can feel safer,
            move better, and experience the difference before committing long-term.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="group relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card sm:p-7"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-brand-soft opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft">
                    <Icon weight="duotone" size={28} aria-hidden="true" className="text-brand-deep" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-ink">{f.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {f.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
