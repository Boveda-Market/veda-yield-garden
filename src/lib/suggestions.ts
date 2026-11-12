import { z } from "zod";

export const SUGGESTION_MAX_CHARS = 500;
export const SUGGESTIONS_PER_DAY = 3;
export const SUGGESTION_CATEGORIES = ["idea", "error", "opinion"] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<SuggestionCategory, string> = { idea: "Idea de mejora", error: "Problema o error", opinion: "Opinión" };

export const suggestionInput = z.object({
  category: z.enum(SUGGESTION_CATEGORIES),
  message: z.string().trim().min(3).max(SUGGESTION_MAX_CHARS),
  wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).nullable().optional(),
}).strict();

/** True when the user already sent the daily maximum in the last 24 hours. */
export const overDailyLimit = (sentLast24h: number) => sentLast24h >= SUGGESTIONS_PER_DAY;

export type Suggestion = { id: string; category: SuggestionCategory; message: string; wallet: string | null; status: "unread" | "reviewed"; createdAt: string };
