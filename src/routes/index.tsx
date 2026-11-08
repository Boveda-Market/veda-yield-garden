import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryAccess } from "@/components/entry-access";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "BÓVEDA — Entra o prueba sin cuenta" },
    { name: "description", content: "Pon tus monedas a trabajar en pools de Solana. Entra a tu cuenta o prueba con 1,000 créditos ficticios sin registro. Hay riesgos y las ganancias no están garantizadas." },
    { property: "og:title", content: "BÓVEDA — Entra o prueba sin cuenta" },
    { property: "og:description", content: "Acceso rápido y prueba gratuita sin mover dinero. Explora bóvedas, portafolio y actividad." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Landing,
});
function Landing() {
  return <div className="min-h-screen bg-background text-foreground"><header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Link to="/" className="flex items-center gap-3 font-display text-lg font-bold"><img src="/icon-512.png" alt="" className="h-9 w-9 rounded-lg" />BÓVEDA</Link><span className="text-xs text-muted-foreground">Tus monedas. Tu control.</span></header>
    <main className="mx-auto max-w-5xl px-6"><section className="flex flex-col items-center border-b border-border pb-10 pt-8 text-center sm:pt-14"><h1 className="font-display text-5xl font-bold">BÓVEDA</h1><p className="mt-5 max-w-lg text-lg leading-7 text-muted-foreground">Una forma de poner tus monedas a trabajar y recibir comisiones en Solana.</p><p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Revisa tu saldo, tus posiciones y cada movimiento. Las ganancias cambian y puedes perder dinero.</p><EntryAccess /></section>
    <section className="flex flex-col items-center py-8 text-center"><p className="font-display text-lg font-semibold">Primero prueba, sin arriesgar dinero.</p><p className="mt-2 text-sm text-muted-foreground">1,000 créditos ficticios. Sin registro, sin wallet y sin dinero real.</p><Button asChild variant="secondary" className="mt-5 h-12"><Link to="/prueba">Probar como invitado<ArrowRight size={16} /></Link></Button><nav aria-label="Acceso rápido" className="mt-6 flex flex-wrap justify-center gap-2"><Button asChild variant="outline" size="sm"><Link to="/prueba">Prueba</Link></Button><Button asChild variant="outline" size="sm"><Link to="/app">Bóvedas</Link></Button><Button asChild variant="outline" size="sm"><Link to="/portfolio">Portafolio</Link></Button><Button asChild variant="outline" size="sm"><Link to="/actividad">Actividad</Link></Button><Button asChild variant="outline" size="sm"><Link to="/cuenta">Mi cuenta</Link></Button><Button asChild variant="outline" size="sm"><Link to="/faq">FAQ</Link></Button></nav><p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} />Cada operación real requiere tu autorización.</p></section></main>
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to="/faq">Preguntas frecuentes</Link><Link to="/terminos">Términos</Link><Link to="/privacidad">Privacidad</Link></nav><p className="mt-4 text-center">Boveda Technologies LLC · No es un banco. Sin ganancias garantizadas. Real está disponible solo como piloto limitado; Prueba no mueve fondos.</p></footer>
  </div>;
}
