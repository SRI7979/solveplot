import { z } from "zod";

export const MAX_PROBLEM_TEXT_LENGTH = 6_000;
export const MAX_PROBLEM_TEXT_BODY_BYTES = 64 * 1024;

export const typedProblemRequestSchema = z
  .object({
    problem: z
      .string()
      .trim()
      .min(1)
      .max(MAX_PROBLEM_TEXT_LENGTH)
      .refine(
        (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      ),
  })
  .strict();

/** Optional source metadata on a saved solution; older image saves have none. */
export function originalProblemText(saved: unknown): string | null {
  if (!saved || typeof saved !== "object") return null;
  const text = (saved as { inputText?: unknown }).inputText;
  const parsed = typedProblemRequestSchema.safeParse({ problem: text });
  return parsed.success ? parsed.data.problem : null;
}
