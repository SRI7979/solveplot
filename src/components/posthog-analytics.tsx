'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsClient, identifyAnalytics } from '@/lib/posthog-client';
import { analyticsPath } from '@/lib/analytics-privacy';
import { acquisitionSource } from '@/lib/product-analytics';

let lastPath: string | null = null;
export default function PostHogAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const ph = await analyticsClient();
      if (!ph || cancelled) return;
      try {
        const response = await fetch('/api/analytics/identity', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          await identifyAnalytics(typeof data.userId === 'string' ? data.userId : null);
        }
      } catch { /* Identity lookup failure never changes authentication. */ }
      if (cancelled) return;
      const path = analyticsPath(pathname);
      if (lastPath === pathname) return;
      lastPath = pathname;
      if (!path) return;
      ph.capture('$pageview', { $current_url: `${location.origin}${path}`, $referrer: document.referrer, source: acquisitionSource(document.referrer, location.origin) });
      if (path === '/solve') ph.capture('solver_opened');
    }
    void refresh().catch(() => {});
    const onAuth = () => { void refresh().catch(() => {}); };
    window.addEventListener('solveplot:auth-changed', onAuth);
    return () => { cancelled = true; window.removeEventListener('solveplot:auth-changed', onAuth); };
  }, [pathname]);
  return null;
}
