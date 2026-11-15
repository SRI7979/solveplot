import type { PostHog } from 'posthog-js';
import { type AnalyticsEvent, type AnalyticsProperties } from './posthog-privacy';
import { filterPostHogEvent, replayOptions } from './posthog-replay';

let client: Promise<PostHog | null> | undefined;
/** One lazy singleton; SDK loading and transport are never awaited by UI/solves. */
export function analyticsClient(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return client ??= (async () => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!token || !host || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return null;
    const { default: posthog } = await import('posthog-js');
    // Keep the recorder version pinned with the SDK; no remote script injection.
    // A blocked recorder must not prevent ordinary product analytics.
    await import('posthog-js/dist/posthog-recorder').catch(() => {});
    posthog.init(token, {
      api_host: host, defaults: '2025-05-24', persistence: 'localStorage',
      capture_pageview: false, capture_pageleave: false, autocapture: false,
      capture_exceptions: false, capture_performance: false, disable_surveys: true,
      rageclick: false, capture_dead_clicks: false, disable_external_dependency_loading: true,
      disable_session_recording: false, enable_recording_console_log: false,
      session_recording: replayOptions,
      person_profiles: 'identified_only', ip: false, save_referrer: false,
      store_google: false, custom_campaign_params: [], advanced_disable_feature_flags_on_first_load: true,
      disable_capture_url_hashes: true,
      before_send: filterPostHogEvent,
    });
    return posthog;
  })().catch(() => null);
}
export function captureAnalytics(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  void analyticsClient().then((ph) => ph?.capture(event, properties)).catch(() => {});
}
export async function identifyAnalytics(userId: string | null) {
  const ph = await analyticsClient();
  if (!ph) return;
  const previous = ph.get_property('$user_id');
  if (previous && previous !== userId) ph.reset();
  if (userId && previous !== userId) ph.identify(userId);
}
