import { useT } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { FEE_WALLET } from "@/lib/fees";

const questions = [
  { question: "¿Puedo probar sin crear una cuenta?", answer: "Sí. Elige Probar como invitado y recibe 1,000 créditos ficticios. No necesitas wallet ni dinero. La prueba se guarda en este navegador." },
  { question: "¿Dónde veo mis depósitos y retiros?", answer: "En Portafolio puedes ver tu saldo, posiciones y Movimientos de bóvedas. Los movimientos reales tienen un comprobante. El historial puede estar incompleto." },
  { question: "¿Qué significa Ganancias (PNL)?", answer: "Es la suma de las comisiones cobradas: USDC más los otros tokens valorados al precio actual. Es un importe bruto, antes de costes; no mide la ganancia o pérdida total de tu inversión. Solo cuenta los movimientos cargados de SOL y MET." },
  { question: "¿Puedo personalizar mi cuenta?", answer: "Sí. En Mi cuenta puedes elegir un nombre y un avatar. Son opcionales y no cambian tu wallet." },
  { question: "¿Cuál es la diferencia entre Real y Prueba?", answer: "Real usa dinero de tu wallet. Prueba usa 1,000 créditos ficticios y no mueve dinero. Los invitados solo tienen acceso a Prueba." },
  { question: "¿Puedo convertir los créditos en dinero?", answer: "No. Los créditos y las ganancias de Prueba son ficticios. No se pueden retirar ni pasar a Real." },
  { question: "¿Cómo pruebo BÓVEDA sin cuenta?", answer: "Desde la página de inicio, toca «Probar como invitado». Usarás 1,000 créditos ficticios que nunca se mezclan con tu cuenta." },
  { question: "¿Cómo inicio sesión?", answer: "Puedes entrar con email, Google o una wallet compatible, como Phantom o Jupiter Wallet. Si entras con email o Google y no tienes wallet, Privy te crea una integrada." },
  { question: "¿Qué hago si no puedo conectar mi wallet?", answer: "Comprueba que esté instalada y desbloqueada. Si estás en la vista previa, prueba abrir la app en otra pestaña. Nunca compartas tus claves ni tu frase de recuperación." },
  { question: "¿Cómo compro USDC?", answer: "Pulsa Comprar USDC en Real o en Mi cuenta. Verás las opciones disponibles y sus costes antes de comprar. La disponibilidad depende del proveedor y de tu país." },
  { question: "¿Cuánto cuesta operar?", answer: "Depositar tiene una comisión del 0%. Cosechar cobra el 1% de los USDC cobrados. Liquidar cobra el 1% del mínimo protegido en USDC; cualquier importe adicional es tuyo. Los costes de red y conversión se pagan aparte." },
  { question: "¿Qué bóvedas puedo consultar?", answer: "SOL, MET y SPCX. En Detalles del pool puedes ver precio, volumen de 24 horas y liquidez. Si un dato no está disponible, lo indicamos." },
  { question: "¿Las ganancias están garantizadas?", answer: "No. Las tasas de Real son estimaciones y cambian. En Prueba son ejemplos ficticios. Puedes perder parte o todo tu dinero. SPCX no equivale a tener acciones de SpaceX." },
  { question: "¿Cuál es la diferencia entre cosechar y liquidar?", answer: "Cosechar cobra las comisiones sin cerrar la posición. Liquidar cierra la posición y convierte los activos admitidos a USDC. Ambas están disponibles para tus posiciones compatibles de SOL y MET, con revisión y firma de tu wallet. La liquidez bloqueada no se puede liquidar; SPCX aún no admite operaciones." },
  { question: "¿Cuánto puedo depositar en Real?", answer: "Entre 1 y 10,000 USDC por depósito en SOL o MET. Después puedes cosechar o liquidar posiciones compatibles con la misma wallet. Cada operación se comprueba antes de firmar." },
  { question: "¿Qué necesito para operar en Real?", answer: "Una wallet con USDC y SOL para los costes de red. Revisa el importe y los costes antes de firmar. Nunca envíes monedas de una red distinta." },
  { question: "¿Por qué se convierte parte de mis USDC?", answer: "Cada bóveda combina USDC con otro token. Parte del depósito puede convertirse a ese token. Al retirar, el importe puede ser distinto al que depositaste." },
  { question: "¿Qué hago si una operación queda pendiente?", answer: "Consulta su comprobante antes de volver a intentarlo. Una operación solo está completada cuando la red la confirma. Si falla, puede cobrar costes de red." },
  { question: "¿Dónde veo mi saldo real?", answer: "Conecta tu wallet y abre Real o Portafolio. Verás tu saldo y las posiciones disponibles. Las cantidades son estimaciones; los datos que no podamos comprobar aparecen como no disponibles." },
  { question: "¿Dónde se guardan mis datos y mi email?", answer: "Privy gestiona tu acceso. La prueba se guarda en tu navegador. Si dejas tu email para novedades, se guarda de forma privada con tu consentimiento. Los movimientos reales son públicos en la red." },
  { question: "¿Puedo instalar BÓVEDA?", answer: "Sí, desde un navegador compatible puedes añadirla a tu pantalla de inicio. Necesitas internet para entrar, consultar saldos y operar." },
];

export function Faq({ preview = false }: { preview?: boolean }) {
  const t = useT();
  return <section aria-label={t("Preguntas frecuentes")} className={preview ? "mt-12 border-t border-border pt-8" : ""}>
    {preview && <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>}
    <div className="w-full">
      {(preview ? questions.slice(0, 7) : questions).map(({ question, answer }) => <details key={question} className="group border-b border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span>{t(question)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <div className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(answer)}</div>
      </details>)}
    </div>
    {!preview && <p className="mt-8 break-all text-xs leading-6 text-muted-foreground">{t("Wallet destinataria de cargos de Real:")}{" "}<span className="font-mono">{FEE_WALLET}</span></p>}
  </section>;
}