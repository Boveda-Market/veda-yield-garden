/** Pure decision logic for downtime alerts: operator at first failure, public channel after a sustained outage. */
export const PUBLIC_AFTER_MS = 3 * 60_000;
export type MonitorRow = { service: string; first_down_at: string | null; operator_alerted: boolean; public_alerted: boolean };
export type MonitorAction = { operatorDown?: boolean; publicDown?: boolean; operatorUp?: boolean; publicUp?: boolean; next: MonitorRow };

export function decide(prev: MonitorRow, down: boolean, now: number): MonitorAction {
  if (down) {
    const first = prev.first_down_at ?? new Date(now).toISOString();
    const operatorDown = !prev.operator_alerted;
    const publicDown = !prev.public_alerted && now - Date.parse(first) >= PUBLIC_AFTER_MS;
    return { operatorDown, publicDown, next: { service: prev.service, first_down_at: first, operator_alerted: true, public_alerted: prev.public_alerted || publicDown } };
  }
  return { operatorUp: prev.operator_alerted, publicUp: prev.public_alerted, next: { service: prev.service, first_down_at: null, operator_alerted: false, public_alerted: false } };
}
