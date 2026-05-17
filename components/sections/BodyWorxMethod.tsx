import { Sparkle, Heart } from '@phosphor-icons/react/dist/ssr';
import Icon3D from '@/components/Icon3D';

const PILLARS: { n: string; icon3d: string; title: string; description: string }[] = [
  {
    n: '01',
    icon3d: 'breathing',
    title: 'Breathing & Pressure Awareness',
    description:
      'Helps reduce unnecessary pressure, improve movement, and prepare your body better for labor.',
  },
  {
    n: '02',
    icon3d: 'pelvic-core',
    title: 'Pelvic Floor + Deep Core Connection',
    description:
      'Supports your changing body, posture, stability, and daily movement during pregnancy.',
  },
  {
    n: '03',
    icon3d: 'mobility',
    title: 'Mobility & Movement Preparation',
    description:
      'Reduces stiffness, improves circulation, and helps your body move more comfortably as pregnancy progresses',
  },
  {
    n: '04',
    icon3d: 'nutrition',
    title: 'Pregnancy-Supportive Nutrition',
    description:
      'Supports energy, recovery, baby development, and healthy weight management during pregnancy',
  },
  {
    n: '05',
    icon3d: 'labor-prep',
    title: 'Labor Prep & Daily Movement Guidance',
    description:
      'Walking, sitting, sleeping, bending, breathing, and movement strategies that help you feel safer & more prepared',
  },
];

const NOTICES = [
  'Less back & pelvic discomfort',
  'Reduced stiffness & heaviness',
  'Better movement & flexibility',
  'More confidence exercising safely',
  'Improved breathing awareness',
  'Feeling calmer & more prepared for labor',
];

export default function BodyWorxMethod() {
  return (
    <section id="method" className="relative overflow-hidden bg-cream-fade py-14 md:py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[min(900px,140%)] -translate-x-1/2 rounded-full bg-brand-soft opacity-40 blur-3xl"
      />

      <div className="bw-wrap relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="bw-chip mx-auto mb-4">
            <Sparkle weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            Why This Works
          </div>
          <h2 className="font-heading text-[28px] font-extrabold leading-[1.1] text-ink sm:text-[38px] lg:text-[50px]">
            The <span className="bw-gradient-text">BodyWorx Prenatal Method™</span>
          </h2>
          <p className="mt-3 font-heading text-[15px] font-semibold text-brand-deep sm:text-lg">
            Designed by women&apos;s health physiotherapists &amp; moms.
          </p>

          <div className="mx-auto mt-5 max-w-3xl space-y-3 text-[15px] text-ink-soft sm:mt-6 sm:text-[16px]">
            <p>
              Most pregnant women are told to either{' '}
              <strong className="text-ink">&ldquo;just rest&rdquo;</strong> — or to
              follow random pregnancy workouts from the internet. That&apos;s why so
              many still struggle with pain, stiffness, weakness, fear of labor, and
              poor recovery afterwards.
            </p>
            <p>
              BodyWorx works because it prepares the systems that{' '}
              <strong className="text-ink">
                actually support your body during pregnancy, labor &amp; recovery
              </strong>{' '}
              — in the right order, before pushing intense exercise.
            </p>
          </div>
        </div>

        {/* Pillars — 5 cards. On lg+, lay out as a 6-col grid with each
            card spanning 2 cols. Cards 4 & 5 get explicit col-starts so
            the bottom row centers (cols 2-3 and 4-5). */}
        <ol className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-6">
          {PILLARS.map((p, idx) => {
            const lgPlacement =
              idx === 3
                ? 'lg:col-span-2 lg:col-start-2'
                : idx === 4
                  ? 'lg:col-span-2 lg:col-start-4'
                  : 'lg:col-span-2';
            return (
              <li
                key={p.n}
                className={`group relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card sm:p-7 ${lgPlacement}`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-brand-soft opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="font-heading text-2xl font-extrabold text-brand">{p.n}</span>
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft"
                    >
                      <Icon3D name={p.icon3d} size={32} />
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold leading-snug text-ink sm:text-xl">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                    {p.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Outcomes panel */}
        <div className="mx-auto mt-12 max-w-4xl rounded-[28px] bg-white p-6 shadow-card ring-1 ring-line sm:p-8 lg:mt-16 lg:p-10">
          <div className="mb-6 text-center">
            <div className="bw-chip mx-auto">
              <Heart weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
              That&apos;s Why Moms Often Notice
            </div>
            <h3 className="mt-3 font-heading text-xl font-extrabold leading-tight text-ink sm:text-2xl lg:text-3xl">
              Small daily shifts. <span className="bw-gradient-text">Real-body changes.</span>
            </h3>
          </div>

          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {NOTICES.map((n) => (
              <li key={n} className="flex items-start gap-3 text-[15px] text-ink-soft">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-soft"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span>
                  <strong className="text-ink">{n.split(' ')[0]}</strong>{' '}
                  {n.split(' ').slice(1).join(' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
