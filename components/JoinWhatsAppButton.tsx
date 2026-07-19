'use client';

import type { ReactNode } from 'react';
import { trackGa4EventOnce } from '@/lib/ga4';

/**
 * WhatsApp community CTA on /thank-you. Wraps the anchor purely so it can own
 * an onClick for the GA4 'join_whatsapp' event.
 *
 * GA4 only - joining the community is an engagement signal, not an ad
 * conversion, so nothing is sent to Meta here.
 *
 * The link opens in a new tab (target="_blank"), which means the /thank-you
 * tab stays alive and a synchronous gtag() call completes normally. No
 * sendBeacon needed - that's only required when the current tab is unloading.
 */
export default function JoinWhatsAppButton({
  href,
  className,
  style,
  children,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  'aria-label'?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={() => trackGa4EventOnce('join_whatsapp')}
    >
      {children}
    </a>
  );
}
