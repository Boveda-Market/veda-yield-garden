import { useT } from "@/lib/i18n";
import { FlaskConical, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppMode } from "@/lib/app-mode";

export function ModeSelector({ mode, onChange }: { mode: AppMode; onChange: (mode: AppMode) => void }) {
  const t = useT();
  return <div role="group" aria-label={t("Modo de Bóveda Market")} className="mb-6 inline-flex gap-1 rounded-lg border border-border bg-muted p-1">
    <Button aria-pressed={mode === "real"} variant={mode === "real" ? "default" : "ghost"} onClick={() => onChange("real")} className="min-w-28"><Wallet size={16} />Real</Button>
    <Button aria-pressed={mode === "trial"} variant={mode === "trial" ? "default" : "ghost"} onClick={() => onChange("trial")} className="min-w-28"><FlaskConical size={16} />{t("Prueba")}</Button>
  </div>;
}