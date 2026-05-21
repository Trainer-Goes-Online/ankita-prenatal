import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Plus_Jakarta_Sans, Poppins, Fraunces } from 'next/font/google';
import Script from 'next/script';
import UtmCapture from '@/components/UtmCapture';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import './globals.css';

const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

// Editorial serif - used for high-impact display headlines (Hero, FinalCTA).
// Loaded once at the root so all sections can opt in via `font-editorial`.
const editorial = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
});

// ── Tracking IDs ─────────────────────────────────────────────────────────────
// Per BACKEND_SOP.md these are literal strings (not env vars). The Meta Pixel
// access token + a duplicate of the pixel ID live in env (.env.local) for the
// server-side CAPI in /api/razorpay/verify-payment. The pixel ID is duplicated
// here as a literal because Next.js inlines it into the client bundle anyway.
const GA4_MEASUREMENT_ID = 'G-EDHH6E5SNS';        // prenatal.bodyworx.in property
const CLARITY_PROJECT_ID = 'ws2a6hcuqu';
const META_PIXEL_ID = '1364192652209120';

const PRICE = CHECKOUT_CONFIG.amountRupeesNumeric;
const DAYS = CHECKOUT_CONFIG.challenge.days;
const METADATA_TITLE = `${CHECKOUT_CONFIG.challenge.brandName} | BodyWorx`;

export const metadata: Metadata = {
  metadataBase: new URL('https://prenatal.bodyworx.in'),
  title: METADATA_TITLE,
  description: `A physiotherapist-led prenatal challenge - reduce pregnancy pain, move safely, prepare your body for labor, and feel stronger in just ${DAYS} days for ₹${PRICE}. 100% money-back guarantee.`,
  openGraph: {
    type: 'website',
    title: METADATA_TITLE,
    description: `Physiotherapist-led prenatal challenge. Reduce pain, prepare for labor, feel stronger in ${DAYS} days - for ₹${PRICE}.`,
    siteName: 'BodyWorx',
  },
  twitter: {
    card: 'summary_large_image',
    title: METADATA_TITLE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F24C69',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${editorial.variable}`}>
      <body className="bodyworx-root font-body bg-white text-ink antialiased">
        {/* Site-wide UTM persistence: writes cookie + rewrites URL on every nav */}
        <UtmCapture />

        {children}

        {/* ── Site footer ── */}
        <footer className="bg-ink text-white/70">
          <div className="bw-wrap py-10 sm:py-12">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
                BodyWorx · Dr. Ankita Prenatal Method™
              </p>

              <p className="mx-auto mt-5 max-w-4xl text-[12.5px] leading-relaxed text-white/65 sm:text-[13.5px]">
                All content, programs and coaching services provided by BodyWorx are
                intended for educational and informational purposes only and do not
                guarantee specific results. This is not medical advice. Always consult
                a qualified healthcare professional - including your obstetrician or
                physiotherapist - before making changes to your diet, exercise, or
                lifestyle during pregnancy. Client results and testimonials vary based
                on individual factors such as consistency, medical history, lifestyle,
                trimester, and adherence to the program. Outcomes are not typical or
                guaranteed. This website is not affiliated with or endorsed by Meta.
                FACEBOOK and INSTAGRAM are trademarks of Meta Platforms, Inc.
              </p>

              <p className="mt-6 text-[12px] text-white/55 sm:text-[13px]">
                © {new Date().getFullYear()} BodyWorx. All rights reserved.
              </p>

              <nav
                aria-label="Legal"
                className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-white sm:text-[14px]"
              >
                <Link href="/privacy-policy" className="hover:text-brand-bright">
                  Privacy Policy
                </Link>
                <span aria-hidden="true" className="text-white/35">·</span>
                <Link href="/terms-and-conditions" className="hover:text-brand-bright">
                  Terms of Use
                </Link>
                <span aria-hidden="true" className="text-white/35">·</span>
                <Link href="/refund-policy" className="hover:text-brand-bright">
                  Refund Policy
                </Link>
              </nav>
            </div>
          </div>
        </footer>

        {/* Razorpay checkout script - always loaded for the modal to be available */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />

        {/* ── GA4 - renders only when ID is filled in ── */}
        {GA4_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: true });
            `}</Script>
          </>
        )}

        {/* ── Microsoft Clarity - renders only when ID is filled in ── */}
        {CLARITY_PROJECT_ID && (
          <Script id="clarity-init" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}</Script>
        )}

        {/* ── Meta Pixel base - init + Manual Advanced Matching (MAM) +
            PageView. Loads fbq globally so the Meta Pixel Helper extension
            detects it. Reads the bw_mam first-party cookie BEFORE PageView
            fires - if the user has previously filled the checkout form, the
            cookie contains pre-hashed em/ph/fn/ln/ct/country and the
            PageView event inherits those signals (EMQ ~8 vs ~6 anonymous).
            For first-time anonymous visitors with no cookie, PageView fires
            with just the auto fbp/fbc/IP/UA signals (EMQ ~6). Server-side
            'sales' custom event lives in /api/razorpay/verify-payment. ── */}
        {META_PIXEL_ID && (
          <>
            <Script id="meta-pixel-init" strategy="afterInteractive">{`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              try {
                var m = document.cookie.match(/(?:^|;\\s*)bw_mam=([^;]+)/);
                if (m) {
                  var mam = JSON.parse(decodeURIComponent(m[1]));
                  if (mam && typeof mam === 'object' && Object.keys(mam).length) {
                    fbq('init', '${META_PIXEL_ID}', mam);
                  }
                }
              } catch (e) {}
              fbq('track', 'PageView');
            `}</Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
