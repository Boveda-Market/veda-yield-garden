import { useT } from "@/lib/i18n";

/** Shared «⚡ Rondas Relámpago» brand badge shown next to every Doble o Nada entry point. */
export function LightningBadge({ className = "", suffix }: { className?: string; suffix?: string }) {
  const t = useT();
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary shadow-[0_0_12px_-3px_var(--primary)] ${className}`}>
    <span aria-hidden className="flame-flicker">⚡</span>{t("Rondas Relámpago")}{suffix ? ` · ${suffix}` : ""}
  </span>;
}
