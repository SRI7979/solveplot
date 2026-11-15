import type { CapturedNetworkRequest, PostHogConfig, SessionRecordingOptions } from 'posthog-js';
import { ANALYTICS_EVENTS, cleanAnalyticsProperties, safeAnalyticsUrl, type AnalyticsEvent } from './posthog-privacy';

/** Preserve CSS classes and structural attributes, never user content in DOM attributes. */
export function maskReplayAttribute(name: string, value: string, element?: Element): string {
  if (['class', 'role', 'type', 'rel', 'disabled', 'checked', 'aria-hidden', 'aria-expanded'].includes(name)) return value;
  if (name === 'href' && element?.tagName === 'LINK' && element.getAttribute('rel') === 'stylesheet') {
    try {
      const url = new URL(value);
      if (url.origin === location.origin && /^\/_next\/static\/[a-zA-Z0-9/_.-]+\.css$/.test(url.pathname)) return `${url.origin}${url.pathname}`;
    } catch { /* Do not retain unknown resource URLs. */ }
  }
  return '';
}

export const replayOptions: SessionRecordingOptions = {
  maskAllInputs: true,
  maskTextSelector: '*',
  maskAttributeFn: maskReplayAttribute,
  blockSelector: 'input[type="file"], img, canvas, iframe, video, audio, svg, math, [class*="dcg-"]',
  slimDOMOptions: 'all',
  inlineStylesheet: false,
  captureJsonLd: false,
  recordCrossOriginIframes: false,
  captureCanvas: { recordCanvas: false },
  recordHeaders: false,
  recordBody: false,
  // Also sanitizes the replay's page URL. Never keep API/network details.
  maskCapturedNetworkRequestFn: maskReplayRequest,

};

/** Snapshots are already masked by the recorder, not ordinary event properties.
 * Keep only its required envelope; the product event allowlist stays unchanged. */
export const filterPostHogEvent: NonNullable<PostHogConfig['before_send']> = (event) => {
  if (!event) return null;
  if (event.event === '$snapshot') {
    const properties = cleanAnalyticsProperties(event.properties);
    for (const key of ['$snapshot_data', '$snapshot_bytes', '$lib', '$lib_version']) {
      if (event.properties[key] !== undefined) properties[key] = event.properties[key];
    }
    return { ...event, properties };
  }
  if (!ANALYTICS_EVENTS.includes(event.event as AnalyticsEvent)) return null;
  return { ...event, properties: cleanAnalyticsProperties(event.properties) };
};

export function maskReplayRequest(request: Partial<CapturedNetworkRequest>): CapturedNetworkRequest | null {
  // SDK page-URL callbacks contain only `name`; network entries have metadata.
  if (!request.isInitial && Object.keys(request).some(key => key !== 'name')) return null;
  const name = safeAnalyticsUrl(request.name);
  return name ? { name, duration: 0, startTime: 0, entryType: 'navigation' } : null;
}
