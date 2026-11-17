import { useT } from "@/lib/i18n";

/** Shared «⚡ Rondas Relámpago» brand seal: arcade style matching the Doble o Nada logo (dark, neon green, electric yellow bolt, italic). */
export function LightningBadge({ className = "", suffix }: { className?: string; suffix?: string }) {
  const t = useT();
  const [first, ...rest] = t("Rondas Relámpago").split(" ");
  return <span className={`inline-flex w-fit shrink-0 -skew-x-6 items-center gap-1.5 rounded-md border-2 border-bolt-neon bg-bolt-ink px-2.5 py-1 font-display text-[11px] font-black uppercase italic leading-none tracking-wider shadow-[0_0_14px_-2px_var(--bolt-neon)] sm:text-xs ${className}`}>
    <span aria-hidden className="flame-flicker text-sm leading-none text-bolt drop-shadow-[0_0_6px_var(--bolt)]">⚡</span>
    <span className="text-bolt-neon">{first}</span>{rest.length ? <span className="text-bolt">{rest.join(" ")}</span> : null}
    {suffix ? <span className="ml-0.5 rounded-sm bg-bolt-neon px-1 py-0.5 text-[10px] not-italic text-bolt-ink">{suffix}</span> : null}
  </span>;
}
