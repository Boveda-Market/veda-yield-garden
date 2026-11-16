import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { getWalletPolicy, setWalletPolicy } from "@/lib/wallet-policy.functions";
import { getMigratePolicy, setMigratePolicy } from "@/lib/migrate-policy.functions";
import { getAutopilotPolicy, setAutopilotPolicy } from "@/lib/autopilot-policy.functions";

/** Operator-only switch: block or allow operations from external wallets. */
export function WalletPolicyAdmin() {
  const t = useT();
  const session = useBovedaSession();
  const qc = useQueryClient();
  const policy = useQuery({ queryKey: ["wallet-policy"], queryFn: () => getWalletPolicy(), staleTime: 30_000 });
  const migrate = useQuery({ queryKey: ["migrate-policy"], queryFn: () => getMigratePolicy(), staleTime: 30_000 });
  const autopilot = useQuery({ queryKey: ["autopilot-policy"], queryFn: () => getAutopilotPolicy(), staleTime: 30_000 });
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
  async function toggleMigrate(v: boolean) {
    setBusy(true); setMsg(null);
    try {
      const token = await session.getAccessToken?.();
      if (!token) throw new Error();
      const r = await setMigratePolicy({ data: { token, enabled: v } });
      if (!r.success) { setMsg(t(r.error)); return; }
      qc.setQueryData(["migrate-policy"], { enabled: v });
      setMsg(v ? t("Sugerencias de migración activadas en la app y Telegram.") : t("Sugerencias de migración desactivadas."));
    } catch { setMsg(t("No se pudo cambiar el ajuste. Abre primero el panel de pagos para verificar la tesorería.")); } finally { setBusy(false); }
  }
  async function toggleAutopilot(v: boolean) {
    setBusy(true); setMsg(null);
    try {
      const token = await session.getAccessToken?.();
      if (!token) throw new Error();
      const r = await setAutopilotPolicy({ data: { token, enabled: v } });
      if (!r.success) { setMsg(t(r.error)); return; }
      qc.setQueryData(["autopilot-policy"], { enabled: v });
      setMsg(v ? t("Piloto automático encendido para todos los usuarios.") : t("Piloto automático apagado para todos: nadie se rebalancea solo hasta que lo enciendas."));
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
      <div className="mt-6 flex items-start justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="font-medium">{t("Sugerencias de migración entre bóvedas")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("Muestra el aviso «Migrar» en la app y publica la alerta en Telegram cuando otra bóveda rinde 5% APR más. Mover capital cuesta ~1% en cambios de mercado; déjalo apagado salvo oportunidades claras.")}</p>
        </div>
        <Switch checked={migrate.data?.enabled ?? false} disabled={busy || migrate.isLoading} onCheckedChange={toggleMigrate} aria-label={t("Sugerencias de migración entre bóvedas")} />
      </div>
      <div className="mt-6 flex items-start justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="font-medium">{t("Piloto automático (todos los usuarios)")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("Recentra solas las bóvedas de rango (como GTA6) que salen de rango. Viene incluido en todas las posiciones; los usuarios solo reciben aviso cuando rebalancea. Apágalo para detenerlo en todos.")}</p>
        </div>
        <Switch checked={autopilot.data?.enabled ?? true} disabled={busy || autopilot.isLoading} onCheckedChange={toggleAutopilot} aria-label={t("Piloto automático (todos los usuarios)")} />
      </div>
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}
