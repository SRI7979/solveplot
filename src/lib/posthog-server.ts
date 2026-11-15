import 'server-only';
import { after } from 'next/server';
import { createHash } from 'node:crypto';

/** Account creation only. Runs after the response; never wraps model requests. */
export function captureSignup(userId: string, method: 'email' | 'google') {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) return;
  // A stable event UUID lets PostHog deduplicate callback retries.
  const hash = createHash('sha256').update(`signup_completed:${userId}`).digest('hex');
  const uuid = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  try {
    after(async () => {
      try {
        const response = await fetch(`${host}/i/v0/e/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: token, event: 'signup_completed', uuid,
            properties: { distinct_id: userId, signup_method: method, $ip: '0.0.0.0', $geoip_disable: true } }),
          signal: AbortSignal.timeout(2000),
        });
        if (!response.ok) console.warn('Analytics signup delivery was not accepted.');
      } catch { console.warn('Analytics signup delivery was unavailable.'); }
    });
  } catch { /* Missing request lifecycle must never break account creation. */ }
}
