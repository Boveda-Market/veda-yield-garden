/** Personal Telegram alert categories; each can be muted independently (all on by default). */
export const ALERT_KINDS = ["harvest", "exit", "deposit", "withdraw", "predict", "commission", "range", "weekly"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_LABEL: Record<AlertKind, string> = {
  harvest: "Cosechas",
  exit: "Cierres de bóveda",
  deposit: "Depósitos",
  withdraw: "Retiros",
  predict: "Resultados y premios de Sube/Baja",
  commission: "Comisiones de afiliado",
  range: "Bóvedas fuera de rango",
  weekly: "Resumen semanal de intereses",
};

export const isAlertKind = (v: unknown): v is AlertKind => typeof v === "string" && (ALERT_KINDS as readonly string[]).includes(v);

/** Muted kinds from storage, ignoring unknown values. */
export const parseMuted = (v: unknown): AlertKind[] => (Array.isArray(v) ? v.filter(isAlertKind) : []);

/** Alerts go out only when the master switch is on and the kind is not muted; untyped alerts follow the master switch. */
export function alertAllowed(enabled: boolean, muted: readonly AlertKind[], kind?: AlertKind): boolean {
  return enabled && (!kind || !muted.includes(kind));
}

/** Next muted list after toggling one kind. */
export function toggleMuted(muted: readonly AlertKind[], kind: AlertKind, on: boolean): AlertKind[] {
  const rest = muted.filter((k) => k !== kind);
  return on ? rest : [...rest, kind];
}
