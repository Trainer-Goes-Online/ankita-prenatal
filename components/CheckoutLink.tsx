'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { fireAtcOnce } from '@/lib/meta-client';
import { trackGa4EventOnce } from '@/lib/ga4';

/**
 * The single CTA wrapper every landing-page "go to checkout" link routes
 * through. Centralising them means the intent events fire from ONE place
 * instead of nine hand-wired onClick handlers that drift apart over time.
 *
 * Fires on the first click of a browser's lifetime:
 *   - Meta  'atc_event' via CAPI beacon  (lib/meta-client.ts)
 *   - GA4   'add_to_cart'                (lib/ga4.ts)
 *
 * The two use separate localStorage namespaces, so a Meta outage can't
 * suppress the GA4 count and vice versa. Neither blocks navigation - both are
 * fire-and-forget and the <Link> behaves exactly as it did before.
 */
export default function CheckoutLink({
  href = '/checkout',
  className,
  children,
  onClick,
  ...rest
}: {
  href?: string;
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className' | 'children'>) {
  // onClick is destructured out of `rest` on purpose: some call sites pass
  // their own handler (the mobile nav closes its menu). Spreading rest after
  // ours would silently overwrite the tracking call, so we compose instead.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    fireAtcOnce();
    trackGa4EventOnce('add_to_cart');
    onClick?.(e);
  }

  return (
    <Link href={href} className={className} {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
