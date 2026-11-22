import { createServerFn } from "@tanstack/react-start";
import { defaultProfile, profileRequest, profileSchema, profileUpdateRequest, type AccountProfile } from "./account-profile";

type ProfileResult = { success: true; profile: AccountProfile } | { success: false; error: string };

export const getAccountProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileRequest.parse(input))
  .handler(async ({ data }): Promise<ProfileResult> => {
    try {
      const { verifiedPrivyId } = await import("./account-profile.server");
      const id = await verifiedPrivyId(data.token);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("account_profiles").upsert({ privy_user_id: id }, { onConflict: "privy_user_id", ignoreDuplicates: true });
      if (error) throw error;
      const result = await supabaseAdmin.from("account_profiles").select("display_name, avatar, photo").eq("privy_user_id", id).single();
      if (result.error) throw result.error;
      return { success: true, profile: result.data ? profileSchema.parse({ displayName: result.data.display_name, avatar: result.data.avatar, photo: result.data.photo ?? "" }) : defaultProfile };
    } catch { return { success: false, error: "No se pudo cargar tu personalización. Puedes seguir usando Bóveda Market." }; }
  });

export const saveAccountProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileUpdateRequest.parse(input))
  .handler(async ({ data }): Promise<ProfileResult> => {
    try {
      const { verifiedPrivyId } = await import("./account-profile.server");
      const id = await verifiedPrivyId(data.token);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("account_profiles").upsert({ privy_user_id: id, display_name: data.profile.displayName, avatar: data.profile.avatar, photo: data.profile.photo, updated_at: new Date().toISOString() });
      if (error) throw error;
      return { success: true, profile: data.profile };
    } catch { return { success: false, error: "No se pudo guardar. Inicia sesión de nuevo e inténtalo otra vez." }; }
  });