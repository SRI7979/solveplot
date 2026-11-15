import { analyticsPath } from './analytics-privacy';

export const ANALYTICS_EVENTS = ['$pageview', '$identify', 'solver_opened', 'question_submitted', 'solution_generated', 'solution_failed', 'desmos_method_viewed', 'algebra_method_viewed', 'calculator_opened', 'signup_completed'] as const;
export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number];
export type AnalyticsProperties = {
  input_type?: 'image' | 'text'; duration_ms?: number; success?: boolean;
  method_selected?: 'desmos' | 'algebra' | 'mental_math' | 'plug_in_answers' | 'shortcut';
  source?: string; failure_stage?: 'request' | 'validation' | 'explanation' | 'timeout' | 'limit';
  surface?: 'solver' | 'question-bank' | 'learn' | 'other'; signup_method?: 'email' | 'google';
};
export function safeAnalyticsUrl(value: unknown): string | undefined {
  try {
    const url = new URL(String(value));
    const path = analyticsPath(url.pathname);
    return /^https?:$/.test(url.protocol) && path ? `${url.origin}${path}` : undefined;
  } catch { return undefined; }
}
export function referralOrigin(value: unknown): string {
  try { const url = new URL(String(value)); return /^https?:$/.test(url.protocol) ? url.origin : '$direct'; }
  catch { return '$direct'; }
}
/** Final outbound allowlist: SDK defaults, remote settings and accidental extra
 * properties must never send question text, account profiles or private URLs. */
export function cleanAnalyticsProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = { $ip: '0.0.0.0', $geoip_disable: true };
  for (const key of ['token', 'distinct_id', '$device_id', '$session_id', '$window_id', '$anon_distinct_id', '$user_id', '$insert_id']) {
    const value = properties[key];
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]{8,200}$/.test(value)) clean[key] = value;
  }
  for (const key of ['$is_identified', 'success']) if (typeof properties[key] === 'boolean') clean[key] = properties[key];
  const choices: Record<string, readonly string[]> = {
    input_type: ['image', 'text'], method_selected: ['desmos', 'algebra', 'mental_math', 'plug_in_answers', 'shortcut'],
    source: ['google', 'bing', 'chatgpt', 'perplexity', 'other_search', 'other_referral', 'direct_or_unknown'],
    failure_stage: ['request', 'validation', 'explanation', 'timeout', 'limit'],
    surface: ['solver', 'question-bank', 'learn', 'other'], signup_method: ['email', 'google'],
  };
  for (const [key, values] of Object.entries(choices)) if (values.includes(String(properties[key]))) clean[key] = properties[key];
  if (typeof properties.duration_ms === 'number' && Number.isFinite(properties.duration_ms)) clean.duration_ms = Math.max(0, Math.min(3600000, Math.round(properties.duration_ms)));
  const url = safeAnalyticsUrl(properties.$current_url);
  if (url) { clean.$current_url = url; clean.$pathname = new URL(url).pathname; }
  if (properties.$referrer) {
    clean.$referrer = referralOrigin(properties.$referrer);
    clean.$referring_domain = clean.$referrer === '$direct' ? '$direct' : new URL(String(clean.$referrer)).hostname;
  }
  return clean;
}
