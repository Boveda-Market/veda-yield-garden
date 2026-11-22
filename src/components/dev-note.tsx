import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const KEY = "boveda_dev_note_seen_v1";

export function DevNote() {
  const t = useT();
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <p className="font-semibold">👋 {t("Hola a todos, les escribe el desarrollador y consultor técnico de Bóveda Market.")}</p>
      <p>{t("Como consultor de software y seguridad a cargo de la arquitectura de Bóveda Market, quiero compartirles por qué esta plataforma se construyó de forma tan distinta a lo que abunda en el mercado.")}</p>
      <p>📉 <b>{t("El colapso de custodios centralizados (2022):")}</b> {t("Celsius y Voyager prometieron \"rendimientos fijos\" y congelaron retiros de la noche a la mañana. Poco después, FTX cayó porque sus administradores movían los fondos de los usuarios a su antojo.")}</p>
      <p>🚨 <b>{t("Esquemas fraudulentos como BuoyStocks (2023–2024):")}</b> {t("mostraban ganancias ficticias en pantalla y, al intentar retirar, bloqueaban la salida y exigían depositar más dinero por supuestos \"impuestos\" o \"tarifas de liberación\" antes de desaparecer.")}</p>
      <p><b>{t("El problema nunca ha sido la tecnología; el problema es cuando una aplicación toma custodia de tus fondos.")}</b> {t("Por eso el requisito fundamental de Bóveda Market fue eliminar la custodia y el factor humano:")}</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>🛡️ <b>{t("Sin custodia:")}</b> {t("Bóveda Market no guarda el dinero de los usuarios. Tu capital permanece en protocolos públicos descentralizados.")}</li>
        <li>🔐 <b>{t("Criptografía MPC y biometría:")}</b> {t("ni los servidores, ni los administradores, ni yo como desarrollador podemos mover fondos. Todo requiere tu huella, Face ID o clave.")}</li>
        <li>⚡ <b>{t("Retiros directos:")}</b> {t("no existe un botón de \"aprobar retiro\". Tu dispositivo firma y la operación se ejecuta en segundos.")}</li>
        <li>📊 <b>{t("Métricas reales:")}</b> {t("sin números inventados. El rendimiento viene de comisiones reales y verificables, y en Sube/Baja operas contra liquidez pública global.")}</li>
        <li>🤝 <b>{t("Comisiones transparentes:")}</b> {t("solo se cobra una fracción cuando cosechas ganancias reales.")}</li>
      </ol>
      <p>{t("Mi trabajo seguirá siendo auditar, monitorear y optimizar cada componente para que tengan una herramienta sólida y blindada.")}</p>
      <p className="rounded-xl border border-primary/40 bg-primary/5 p-3 font-medium">{t("Nadie del equipo de Bóveda Market te escribirá jamás por privado primero pidiendo dinero, claves ni frases de recuperación.")}</p>
    </div>
  );
}

export function DevNoteWelcome() {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { /* ignore */ } }, []);
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setOpen(false); };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 font-display"><ShieldCheck size={20} className="text-primary" />{t("Por qué tus fondos están seguros")}</DialogTitle>
        <DialogDescription>{t("Mensaje del desarrollador y consultor técnico de Bóveda Market.")}</DialogDescription>
        <DevNote />
        <Button className="mt-2 w-full" onClick={close}>{t("Entendido, ir a Mi Billetera")}</Button>
      </DialogContent>
    </Dialog>
  );
}
