import { z } from "zod";

/** Icon avatars; tier avatars unlock by account level (cosmetic only, never a permission). */
export const AVATAR_IDS = ["leaf", "sun", "gem", "waves", "vault", "shield", "zap", "flame", "star", "diamond", "crown"] as const;
export const AVATAR_MIN_TIER: Record<(typeof AVATAR_IDS)[number], number> = { leaf: 0, sun: 0, gem: 0, waves: 0, vault: 0, shield: 0, zap: 0, flame: 0, star: 1, diamond: 2, crown: 3 };
export const PHOTO_MAX_CHARS = 140_000;
const photoPattern = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/;

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, "Usa un nombre de hasta 60 caracteres."),
  avatar: z.enum(AVATAR_IDS),
  photo: z.string().max(PHOTO_MAX_CHARS).refine((v) => v === "" || photoPattern.test(v), "Foto no válida").default(""),
}).strict();
export type AccountProfile = z.infer<typeof profileSchema>;
export const defaultProfile: AccountProfile = { displayName: "", avatar: "leaf", photo: "" };
export const profileRequest = z.object({ token: z.string().min(20).max(12000) }).strict();
export const profileUpdateRequest = profileRequest.extend({ profile: profileSchema });
