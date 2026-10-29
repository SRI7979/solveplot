import { getLesson } from "./learn-catalog";
import { LEARNING_UNITS } from "./learning-path";

/** Keep untrusted form/query values from becoming open redirects. */
export function safeAuthRedirect(value: unknown): string {
  if (typeof value !== "string") return "/solve";
  if (value === "/solve" || value === "/learn" || value === "/history" || value === "/tricks" || value === "/settings" || value === "/profile") return value;
  if (value.startsWith("/learn/") && getLesson(value.slice("/learn/".length))) return value;
  if (LEARNING_UNITS.some((unit) => value === `/learn/checkpoint/${unit.id}`)) return value;
  if (/^\/history\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }
  return "/solve";
}
