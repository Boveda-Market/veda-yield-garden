// If the custom Privy domain does not answer (e.g. missing DNS), strip it from the app config
// so the SDK keeps using the official auth.privy.io and login never freezes.
let installed = false;
const reachable = new Map<string, Promise<boolean>>();

export function probeHost(url: string, timeoutMs = 2500): Promise<boolean> {
  if (!reachable.has(url)) {
    reachable.set(url, (async () => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      try { await fetch(url, { mode: "no-cors", signal: ctrl.signal, cache: "no-store" }); return true; }
      catch { return false; }
      finally { clearTimeout(id); }
    })());
  }
  return reachable.get(url)!;
}

export function installPrivyApiFallback(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await original(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!/^https:\/\/auth\.privy\.io\/api\/v1\/apps\/[^/?]+$/.test(url.split("?")[0] ?? "") || !res.ok) return res;
    try {
      const data = await res.clone().json();
      const custom = data?.custom_api_url;
      if (typeof custom !== "string" || !custom) return res;
      if (await probeHost(custom)) return res;
      console.warn("[BÓVEDA] custom Privy domain unreachable, using auth.privy.io");
      return new Response(JSON.stringify({ ...data, custom_api_url: null }), { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch { return res; }
  };
}
