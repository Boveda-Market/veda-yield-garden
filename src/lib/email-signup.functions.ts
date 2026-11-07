import { createServerFn } from "@tanstack/react-start";
import { emailSignupSchema, EMAIL_CONSENT_VERSION } from "@/lib/email-signup";

export const submitEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSignupSchema.parse(input))
  .handler(async ({ data }) => {
    // Public, insert-only subscription action: validated consent, honeypot and DB throttle.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("email_submissions").insert({ email: data.email, consent_version: EMAIL_CONSENT_VERSION });
    if (error) return { success: false };
    return { success: true };
  });