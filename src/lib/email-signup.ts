import { z } from "zod";
export const EMAIL_CONSENT_VERSION = "2026-11-07";
export const emailSignupSchema = z.object({
  email: z.string().trim().email("Introduce un email válido").max(254).transform((email) => email.toLowerCase()),
  consent: z.literal(true),
  website: z.string().max(0),
});