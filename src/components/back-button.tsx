import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

/** Visible "Back" pill: returns to the previous screen, or to `fallback` when opened directly. */
export function BackButton({ fallback = "/app", className = "" }: { fallback?: string; className?: string }) {
  const t = useT();
  const router = useRouter();
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.history.back();
    else void router.navigate({ to: fallback });
  };
  return <button type="button" onClick={back} className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-card px-3 text-xs font-semibold text-primary hover:bg-secondary ${className}`}><ArrowLeft size={14} aria-hidden />{t("Volver")}</button>;
}
