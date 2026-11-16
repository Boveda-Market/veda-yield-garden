import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Collapsed "Ver detalles" disclosure: breakdowns and explanations stay available without crowding the first screen. */
export function DetailsToggle({ children, label }: { children: ReactNode; label?: string }) {
  const t = useT();
  return <details className="group w-full text-left text-sm">
    <summary className="flex cursor-pointer list-none items-center justify-center gap-1 py-1 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
      {label ?? t("Ver detalles")}<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
    </summary>
    <div className="mt-2 grid gap-2">{children}</div>
  </details>;
}
