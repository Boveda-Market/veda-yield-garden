import { useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { DetailsToggle } from "@/components/ui/details-toggle";
import { FlowSteps } from "@/components/move-steps";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { Dismissible } from "@/components/dismissible";

export type ReceiptRow = { label: string; value: string };

/**
 * Shared "operation receipt" after a confirmed operation (Robinhood / Coinbase style):
 * calm animated check, the amount, a few detail lines with date and time, and a single main "Done" button.
 */
export function ActionSuccess({ title, body, signature, onClose, destination = "/portfolio", amount, details = [], doneLabel }: {
  title: string; body: string; signature: string | null; onClose: () => void;
  destination?: "/portfolio" | "/wallet" | null;
  amount?: { value: string; unit: string; label?: string } | undefined;
  details?: ReceiptRow[];
  doneLabel?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter({ warn: false });
  const [at] = useState(() => new Date());
  const done = () => { onClose(); if (destination && router) void router.navigate({ to: destination }); };
  const rows: ReceiptRow[] = [...details, { label: t("Fecha y hora"), value: at.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) }];
  return <Dismissible onDismiss={done} ms={Infinity} className="rounded-2xl bg-card text-primary"><section role="status" className="grid justify-items-center gap-4 p-6 text-center text-sm text-foreground">
    <FlowSteps current={3} />
    <span className="relative grid size-16 place-items-center" aria-hidden>
      <span className="absolute inset-0 rounded-full bg-primary/15 motion-safe:animate-ping motion-safe:[animation-iteration-count:1] motion-safe:[animation-duration:900ms]" />
      <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500"><Check className="size-8" strokeWidth={3} /></span>
    </span>
    <div className="grid gap-1">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {amount && <p className="font-display text-3xl font-bold tabular-nums motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">{amount.label && <span className="mr-1 text-base font-semibold text-muted-foreground">{amount.label}</span>}{amount.unit === "$" ? `$${amount.value}` : <>{amount.value} <span className="text-base font-semibold text-muted-foreground">{amount.unit}</span></>}</p>}
    </div>
    <p className="text-muted-foreground">{body}</p>
    <Button className="w-full active:scale-[0.98]" size="lg" onClick={done}>{doneLabel ?? t(destination === "/wallet" ? "Listo · ver billetera" : destination ? "Listo · ver mi posición" : "Listo")}</Button>
    <DetailsToggle><dl className="grid w-full gap-2 rounded-xl border border-border bg-background/60 p-4 text-left">
      {rows.map((r) => <div key={r.label} className="flex justify-between gap-3"><dt className="text-muted-foreground">{r.label}</dt><dd className="text-right font-medium">{r.value}</dd></div>)}
      {signature && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comprobante")}</dt><dd><a href={`https://orbmarkets.io/tx/${signature}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">{signature.slice(0, 6)}…{signature.slice(-4)}</a></dd></div>}
    </dl></DetailsToggle>
  </section></Dismissible>;
}

/** Big highlighted "you receive" card. */
export function ReceiveCard({ label, amount, unit, sub }: { label: string; amount: string; unit: string; sub?: string | undefined }) {
  return <div className="rounded-xl bg-muted p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-bold text-primary">{unit === "$" ? `$${amount}` : <>{amount} <span className="text-base font-semibold text-foreground">{unit}</span></>}</p>
    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
  </div>;
}
