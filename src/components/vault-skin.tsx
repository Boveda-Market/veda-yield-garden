import { useI18n, useT } from "@/lib/i18n";
import type { Vault } from "@/lib/vaults";
// Title lettering for GTA6 is pre-rendered artwork; DCTY uses the token's own coin logo plus display lettering.
import gtaTitleEs from "@/assets/gta6-vault-title.png";
import gtaTitleEn from "@/assets/gta6-vault-title-en.png";
import dctyLogo from "@/assets/dcty-logo.png";
import trumpLogo from "@/assets/trump-logo.png";

/** CSS skin that re-colours the shared high-octane (--hot) tokens per vault; GTA6 keeps the default sunset palette. */
export const vaultSkin = (id: string | undefined) => (id === "dcty" ? "vault-dcty" : id === "trump" ? "vault-trump" : "");

/** DacityCoin night city: neon skyline over the water with a pink speedboat crossing (original art, no game assets). */
export function DctySkyline() {
  const towers = [[0, 52, 22], [24, 38, 16], [42, 60, 26], [70, 30, 14], [86, 46, 20], [108, 66, 18], [128, 40, 24], [154, 54, 16], [172, 34, 22], [196, 62, 20], [218, 44, 14], [234, 70, 24], [260, 36, 18], [280, 58, 22], [304, 42, 16], [322, 74, 20], [344, 48, 24], [370, 32, 30]] as const;
  return <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="xMaxYMax slice" className="pointer-events-none absolute inset-0 h-full w-full">
    <defs>
      <linearGradient id="dcty-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hot-3)" stopOpacity="0" /><stop offset="1" stopColor="var(--hot)" stopOpacity="0.55" /></linearGradient>
      <linearGradient id="dcty-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hot-2)" stopOpacity="0.5" /><stop offset="1" stopColor="var(--hot-surface)" stopOpacity="0.9" /></linearGradient>
    </defs>
    <rect width="400" height="84" fill="url(#dcty-sky)" />
    {towers.map(([x, h, w]) => <g key={x}>
      <rect x={x} y={84 - h} width={w} height={h} fill="var(--hot-surface)" opacity="0.7" />
      {Array.from({ length: Math.floor(h / 10) }, (_, r) => <rect key={r} x={x + 3} y={84 - h + 4 + r * 10} width={w - 6} height="2" fill={r % 2 ? "var(--hot-2)" : "var(--hot)"} opacity="0.3" />)}
    </g>)}
    <rect y="84" width="400" height="16" fill="url(#dcty-water)" />
    <g className="dcty-boat"><path d="M0 88 h26 l-5 5 h-18 z" fill="var(--hot)" /><path d="M-30 92 h28" stroke="var(--hot-foreground)" strokeOpacity="0.5" strokeWidth="1" /></g>
  </svg>;
}


/** TRUMP presidential flag: navy canton with stars and waving red/white stripes (original vector art). */
export function TrumpFlag() {
  return <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><rect y="96" width="400" height="4" fill="var(--hot)" /></svg>;
}

/** Per-vault title lettering used by banners, cards and the deposit sheet. */
export function VaultTitle({ vault, className = "h-8 sm:h-9" }: { vault: Pick<Vault, "id" | "name">; className?: string }) {
  const t = useT();
  const { lang } = useI18n();
  if (vault.id === "trump") return <span className={`flex items-center gap-1.5 ${className}`}>
    <img src={trumpLogo} alt="" aria-hidden width={160} height={160} className="h-[115%] w-auto shrink-0 rounded-full ring-2 ring-hot-2 drop-shadow-[0_0_10px_var(--hot-2)]" />
    <span className="-rotate-2 whitespace-nowrap font-display text-[1.35em] font-black italic uppercase leading-none tracking-tight text-hot-foreground [text-shadow:0_2px_0_var(--hot-surface),0_0_8px_var(--hot-surface)]">{lang === "en" ? <><span className="trump-gold">TRUMP</span> Vault</> : <>Bóveda <span className="trump-gold">TRUMP</span></>}<span className="mt-1 block rotate-0 text-[0.45em] font-bold not-italic tracking-[0.35em] text-[color:var(--trump-gold,#caa75e)] [text-shadow:none]">{lang === "en" ? "OFFICIAL" : "OFICIAL"}</span></span>
    <span className="sr-only">{t(vault.name)}</span>
  </span>;
  if (vault.id === "dcty") return <span className={`flex items-center gap-1.5 ${className}`}>
    <img src={dctyLogo} alt="" aria-hidden width={160} height={160} className="h-[115%] w-auto shrink-0 rounded-full ring-2 ring-hot-2 drop-shadow-[0_0_10px_var(--hot-2)]" />
    <span className="-rotate-2 whitespace-nowrap font-display text-[1.35em] font-black italic uppercase leading-none tracking-tight text-hot-foreground [text-shadow:0_2px_0_var(--hot-surface),0_0_8px_var(--hot-surface)]">{lang === "en" ? <><span className="text-hot-2 [text-shadow:0_0_10px_var(--hot-2),0_2px_0_var(--hot-surface)]">DCTY</span> Vault</> : <>Bóveda <span className="text-hot-2 [text-shadow:0_0_10px_var(--hot-2),0_2px_0_var(--hot-surface)]">DCTY</span></>}</span>
    <span className="sr-only">{t(vault.name)}</span>
  </span>;
  return <img src={lang === "en" ? gtaTitleEn : gtaTitleEs} alt={t(vault.name)} width={lang === "en" ? 935 : 1074} height={lang === "en" ? 233 : 228} className={`w-auto max-w-full -rotate-2 ${className}`} />;
}
