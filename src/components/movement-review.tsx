import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reviewVaultMovements } from "@/lib/movement-review.functions";
import type { MovementFlag, ReviewMovement } from "@/lib/movement-review";

const FlagsContext = createContext<Map<string, string>>(new Map());

export function MovementReviewProvider({ movements, children }: { movements: ReviewMovement[]; children: ReactNode }) {
  const review = useServerFn(reviewVaultMovements);
  const key = movements.map((m) => `${m.id}:${m.amount}`).join("|");
  const query = useQuery({ queryKey: ["movement-review", key], enabled: movements.length >= 3, staleTime: 10 * 60_000, retry: false,
    queryFn: () => review({ data: { movements } }) });
  const flags: MovementFlag[] = query.data?.success ? query.data.flags : [];
  return <FlagsContext.Provider value={new Map(flags.map((f) => [f.id, f.reason]))}>
    {movements.length >= 3 && <p role="status" className="mt-3 text-xs text-muted-foreground">{query.isFetching ? "Revisando depósitos y retiros fuera de lo normal…" : query.data && !query.data.success ? query.data.error : query.data ? (flags.length ? `${flags.length} ${flags.length === 1 ? "movimiento marcado" : "movimientos marcados"} para revisar antes de actuar. Revisión automática; puede equivocarse.` : "No vimos depósitos ni retiros fuera de lo normal.") : null}</p>}
    {children}
  </FlagsContext.Provider>;
}

export function MovementFlagNote({ id }: { id: string }) {
  const reason = useContext(FlagsContext).get(id);
  if (!reason) return null;
  return <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-destructive"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />Revisar antes de actuar: {reason}</p>;
}
