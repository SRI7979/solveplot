import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import type { PracticeProblem } from "./practice-generation";
import { solutionSchema, answerChoiceSchema } from "./solver-schema";
import { TECHNIQUE_IDS } from "./technique-vocabulary";
import { practiceSourceSchema } from "./practice-source";
import type { PracticeSource } from "./practice-types";

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const MAX_PRACTICE_TOKEN_LENGTH = 18_000;

const sessionSchema = z.object({
  version: z.literal(1), userId: z.string().min(1).max(80), expiresAt: z.number().int(), source: practiceSourceSchema,
  problem: z.object({
    exercise: z.object({
      id: z.string().uuid(), question: z.string().max(8_000), choices: z.array(answerChoiceSchema).max(4).nullable(),
      techniqueId: z.enum(TECHNIQUE_IDS), techniqueName: z.string().max(80), structure: z.string().max(240),
      answerFormat: z.enum(["numeric", "choice"]), calculatorUseful: z.boolean(),
    }),
    answer: z.number().finite(), correctChoice: z.string().max(4).nullable(), hint: z.string().max(1_000),
    feedback: z.string().max(1_000), solution: solutionSchema,
  }),
});
export type PracticeSession = z.infer<typeof sessionSchema>;

function key(secret: string) {
  if (secret.trim().length < 24) throw new Error("Practice session encryption is not configured");
  return createHash("sha256").update("solveplot:practice-session:v1\0").update(secret).digest();
}

/** Authenticated encryption keeps answers opaque and portable across serverless instances. */
export function sealPracticeSession(input: { userId: string; source: PracticeSource; problem: PracticeProblem }, secret: string, now = Date.now()): string {
  const session = sessionSchema.parse({ ...input, version: 1, expiresAt: now + SESSION_TTL_MS });
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), nonce);
  cipher.setAAD(Buffer.from("solveplot-practice-v1"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const token = ["v1", nonce.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  if (token.length > MAX_PRACTICE_TOKEN_LENGTH) throw new Error("Practice session exceeds its limit");
  return token;
}

export function openPracticeSession(token: string, userId: string, secret: string, now = Date.now()): PracticeSession | null {
  if (token.length > MAX_PRACTICE_TOKEN_LENGTH) return null;
  try {
    const [version, nonceText, ciphertextText, tagText, extra] = token.split(".");
    if (version !== "v1" || extra !== undefined || !nonceText || !ciphertextText || !tagText) return null;
    if (![nonceText, ciphertextText, tagText].every(part => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const nonce = Buffer.from(nonceText, "base64url"), tag = Buffer.from(tagText, "base64url");
    if (nonce.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), nonce);
    decipher.setAAD(Buffer.from("solveplot-practice-v1"));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
    const parsed = sessionSchema.safeParse(JSON.parse(plaintext));
    if (!parsed.success || parsed.data.userId !== userId || parsed.data.expiresAt <= now || parsed.data.expiresAt > now + SESSION_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
