"use client";

import PostHogAnalytics from "./posthog-analytics";
import { Analytics } from "@vercel/analytics/next";
import { sanitizeAnalyticsEvent } from "@/lib/analytics-privacy";

/** Retain the existing page-view integration while removing private URL details. */
export default function PrivacyAnalytics() {
  return <><Analytics beforeSend={sanitizeAnalyticsEvent} /><PostHogAnalytics /></>;
}
