import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalLayout({ title, children, legal = true }: { title: string; children: ReactNode; legal?: boolean }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <Button asChild variant="ghost"><Link to="/"><ArrowLeft />Volver a BÓVEDA</Link></Button>
    <p className="mt-10 font-display text-lg font-bold">BÓVEDA · Boveda Technologies LLC</p>
    <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{legal ? "Vigente desde el" : "Actualizado el"} 7 de noviembre de 2026</p>
    <article className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">{children}</article>
    <nav className="mt-10 flex flex-wrap gap-5 border-t border-border pt-5 text-sm text-primary"><Link to="/faq">Preguntas frecuentes</Link><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Política de privacidad</Link></nav>
  </main>;
}
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 font-display text-lg font-semibold text-foreground">{title}</h2>{children}</section>;
}