import { z } from "zod";
import { tutorSourceSchema } from "./tutor";

/** Server validation. Lesson sources name published content, never client-authored examples. */
export const practiceSourceSchema = z.union([
  tutorSourceSchema,
  z.object({ kind: z.literal("lesson"), slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict(),
]);
