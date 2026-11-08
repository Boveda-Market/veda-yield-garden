import { useT } from "@/lib/i18n";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { emailSignupSchema } from "@/lib/email-signup";
import { submitEmail } from "@/lib/email-signup.functions";

export function EmailSignup() {
  const t = useT();
  const submit = useServerFn(submitEmail);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
  return <section className="mt-12 border-t border-border pt-8">
    <h2 className="font-display text-xl font-semibold">{t("Novedades de BÓVEDA")}</h2>
    <form className="mt-4 max-w-xl space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      if (state === "pending") return;
      const parsed = emailSignupSchema.safeParse({ email, consent, website });
      if (!parsed.success) { setState("error"); return; }
      setState("pending");
      try { const result = await submit({ data: parsed.data }); setState(result.success ? "success" : "error"); }
      catch { setState("error"); }
    }}>
      <label className="block text-sm">Email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 block w-full rounded-md border border-input bg-card px-4 py-3" /></label>
      <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      <label className="flex items-start gap-3 text-sm text-muted-foreground"><input required type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>{t("Quiero recibir novedades de BÓVEDA y autorizo guardar mi email conforme a la")}{" "}<Link to="/privacidad" className="text-primary underline">{t("política de privacidad")}</Link>{t(". Puedo retirar mi consentimiento.")}</span></label>
      <Button type="submit" disabled={!consent || state === "pending" || state === "success"}>{state === "pending" ? t("Guardando…") : state === "success" ? t("Email registrado") : t("Registrar mi email")}</Button>
      {state === "success" && <p role="status" className="text-sm text-primary">{t("Tu email quedó registrado.")}</p>}
      {state === "error" && <p role="alert" className="text-sm text-destructive">{t("No pudimos guardar tu email. Revisa los datos o espera un minuto e inténtalo de nuevo.")}</p>}
    </form>
  </section>;
}