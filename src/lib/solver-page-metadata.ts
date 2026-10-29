import type { Metadata } from "next";
import { PRIVATE_ROBOTS, publicPageMetadata } from "./site-metadata";

/** Only the anonymous solver entrance belongs in search. Personal workspace
 * responses retain noindex, independent of the cookie-header safeguard. */
export function solverPageMetadata(authenticated: boolean): Metadata {
  const metadata = publicPageMetadata({
    title: "Free SAT Math Solver with Steps and Desmos | SolvePlot",
    description: "Upload or type an SAT math question to see Desmos calculator steps, explanations, and alternative methods. Browse free; sign in to solve and save your work.",
    path: "/solve",
  });
  return authenticated ? { ...metadata, robots: PRIVATE_ROBOTS } : metadata;
}
