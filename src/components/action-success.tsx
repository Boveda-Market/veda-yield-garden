import { CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Dismissible } from "@/components/dismissible";

/** Shared confirmation screen after a vault operation is confirmed on-chain. */
export function ActionSuccess({ title, body, signature, onClose }: { title: string; body: string; signature: string | null; onClose: () => void }) {
  const t = useT();
  return <Dismissible onDismiss={onClose} className="rounded-xl bg-primary/10 text-primary"><section className="grid justify-items-center gap-3 p-6 text-center text-sm text-foreground">
    <CheckCircle2 className="h-12 w-12 text-primary motion-safe:animate-in motion-safe:zoom-in" aria-hidden />
    <h3 className="font-display text-xl font-bold">{title}</h3>
    <p className="text-muted-foreground">{body}</p>
    <Button asChild className="w-full"><Link to="/portfolio" onClick={onClose}>{t("Ver en mi Portafolio")}</Link></Button>
    <Button variant="ghost" className="w-full" onClick={onClose}>{t("Listo")}</Button>
    {signature && <Link to="/wallet" onClick={onClose} className="text-xs underline">{t("Ver en tu wallet")}</Link>}
  </section></Dismissible>;
}

/** Big highlighted "you receive" card. */
export function ReceiveCard({ label, amount, unit, sub }: { label: string; amount: string; unit: string; sub?: string | undefined }) {
  return <div className="rounded-xl bg-muted p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-bold text-primary">{amount} <span className="text-base font-semibold text-foreground">{unit}</span></p>
    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
  </div>;
}
