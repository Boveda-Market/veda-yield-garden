import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { getWalletPolicy, setWalletPolicy } from "@/lib/wallet-policy.functions";

/** Operator-only switch: block or allow operations from external wallets. */
export function WalletPolicyAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const qc = useQueryClient();
  const policy = useQuery({ queryKey: ["wallet-policy"], queryFn: () => getWalletPolicy(), staleTime: 30_000 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return null;
  const on = policy.data?.blockExternal ?? false;
  async function toggle(v: boolean) {
    setBusy(true); setMsg(null);
    try {
      const token = await session.getAccessToken?.();
      if (!token) throw new Error();
      const r = await setWalletPolicy({ data: { token, blockExternal: v } });
      if (!r.success) { setMsg(t(r.error)); return; }
      qc.setQueryData(["wallet-policy"], { blockExternal: v });
      setMsg(v ? t("Wallets externas bloqueadas: ahora solo pueden ver la app.") : t("Wallets externas desbloqueadas: ya pueden operar."));
    } catch { setMsg(t("No se pudo cambiar el ajuste. Abre primero el panel de pagos para verificar la tesorería.")); } finally { setBusy(false); }
  }
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />{t("Seguridad y acceso")}</h2>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{t("Bloquear operaciones con wallets externas")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("Si lo activas, Phantom, Jupiter y otras wallets externas solo podrán ver la app. Las billeteras de BÓVEDA (Google, email o passkey) siguen operando.")}</p>
        </div>
        <Switch checked={on} disabled={busy || policy.isLoading} onCheckedChange={toggle} aria-label={t("Bloquear operaciones con wallets externas")} />
      </div>
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}
