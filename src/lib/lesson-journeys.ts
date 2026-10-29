import { DESMOS_JOURNEYS } from "../content/lessons/desmos-journeys";
import { SAT_JOURNEYS } from "../content/lessons/sat-journeys";
import type { LessonJourney } from "./lesson-journey-types";

// Server-side registry. Only the requested lesson crosses the client boundary.
const journeys: Record<string, LessonJourney> = { ...DESMOS_JOURNEYS, ...SAT_JOURNEYS };

export function getLessonJourney(slug: string): LessonJourney | null {
  return Object.hasOwn(journeys, slug) ? journeys[slug] : null;
}
