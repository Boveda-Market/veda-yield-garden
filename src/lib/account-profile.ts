import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().max(60, "Usa un nombre de hasta 60 caracteres."),
  avatar: z.enum(["leaf", "sun", "gem", "waves"]),
}).strict();
export type AccountProfile = z.infer<typeof profileSchema>;
export const defaultProfile: AccountProfile = { displayName: "", avatar: "leaf" };
export const profileRequest = z.object({ token: z.string().min(20).max(12000) }).strict();
export const profileUpdateRequest = profileRequest.extend({ profile: profileSchema });