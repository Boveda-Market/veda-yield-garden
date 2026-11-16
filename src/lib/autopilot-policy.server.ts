const KEY = "autopilot_global_off";
let cache: { v: boolean; at: number } | null = null;

/** Operator switch (system_service_status row, operator_alerted = paused). Default: Autopilot on for everyone. */
export async function autopilotGlobalOn(): Promise<boolean> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("system_service_status").select("operator_alerted").eq("service", KEY).maybeSingle();
  const v = !data?.operator_alerted;
  cache = { v, at: Date.now() };
  return v;
}

export async function setAutopilotGlobalOn(v: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("system_service_status").upsert({ service: KEY, operator_alerted: !v, public_alerted: false, first_down_at: null, updated_at: new Date().toISOString() }, { onConflict: "service" });
  if (error) throw error;
  cache = { v, at: Date.now() };
}
