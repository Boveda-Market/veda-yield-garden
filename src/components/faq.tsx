import { Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FEE_WALLET } from "@/lib/fees";

const questions = [
  { question: "¿BÓVEDA mueve dinero real?", answer: "No. El acceso con Privy es real, pero los 1,000 USDC iniciales, las posiciones, las ganancias y los cargos son ficticios. Esta versión no consulta tu saldo real ni deposita, intercambia o transfiere fondos en Solana. No envíes fondos para probar la demostración." },
  { question: "¿Cómo inicio sesión con Phantom o Jupiter Wallet?", answer: "Elige Phantom / Jupiter en el acceso y selecciona tu wallet en Privy. Necesitas una wallet compatible disponible en ese navegador o dispositivo y aprobar la solicitud de acceso. También puedes usar email o Google, según los métodos habilitados. Iniciar sesión no autoriza movimientos de fondos." },
  { question: "¿Por qué mi wallet no aparece o no puedo entrar?", answer: "Comprueba que Phantom o Jupiter Wallet estén disponibles y desbloqueadas en el navegador que estás usando. Si Privy rechaza el acceso por el dominio, el operador debe autorizar ese dominio en Privy. La disponibilidad en móvil depende del navegador y de la compatibilidad de la wallet; nunca compartas tu frase semilla para resolver un problema de acceso." },
  { question: "¿Necesito tener una wallet para usar BÓVEDA?", answer: "Puedes acceder con email o Google. Privy está configurado para crear una wallet Solana integrada a usuarios sin wallet, sujeto a la configuración y disponibilidad del proveedor. Esa wallet no convierte el saldo de demostración en USDC reales ni habilita depósitos." },
  { question: "¿Qué bóvedas y estadísticas puedo consultar?", answer: "El catálogo incluye SOL/USDC, MET/USDC y SPCX/USDC en Meteora DAMM v2. Los detalles muestran precio en USD, variación de 24 horas, volumen de 24 horas, liquidez y cantidades de tokens disponibles en DexScreener para cada dirección exacta de pool. Los datos pueden retrasarse; lo que no está disponible no se presenta como cero. La URL de Meteora se ofrece solo para copiar." },
  { question: "¿Los APY y las ganancias están garantizados?", answer: "No. Los APY del catálogo son ejemplos ilustrativos usados para calcular ganancias ficticias; no son tasas verificadas de Meteora ni se derivan de las estadísticas de DexScreener. Una futura operación real implicaría volatilidad, pérdida impermanente, riesgo de contratos, pérdida de paridad de USDC y posible pérdida total del capital. SPCX no implica acciones directas ni afiliación con SpaceX." },
  { question: "¿Cuánto cuesta cada operación?", answer: "El cargo operativo es del 1% en USDC sobre cada depósito, cosecha o liquidación, destinado a operación y mantenimiento. Se descuenta del importe bruto: de 100 USDC quedan 99 USDC netos. En una cosecha se aplica solo a las ganancias retiradas; en una liquidación, al capital más las ganancias pendientes. El desglose se revisa antes de confirmar y se trunca a seis decimales. En esta versión todo es simulado; no se envía el cargo a ninguna wallet." },
  { question: "¿Cuál es la diferencia entre cosechar y liquidar?", answer: "Cosechar Ganancias devuelve las ganancias ficticias netas al saldo de demostración y mantiene el capital de la posición. Cerrar y Liquidar elimina la posición y devuelve el capital más las ganancias pendientes, menos el cargo del 1%. Ninguna de las dos acciones ejecuta una transacción real." },
  { question: "¿Dónde se guardan mis datos y mi email?", answer: "Privy gestiona el acceso. Las posiciones y los saldos ficticios se guardan en tu navegador separados por tu identificador de Privy; cerrar sesión no los borra y borrar el almacenamiento local puede eliminarlos. El formulario de novedades guarda tu email y consentimiento en un registro privado de Lovable Cloud, independiente del login. Registrarte no activa envíos automáticos de novedades." },
  { question: "¿Puedo instalar BÓVEDA en mi dispositivo?", answer: "Puedes añadir BÓVEDA a tu pantalla de inicio desde un navegador compatible. La opción de instalación depende del dispositivo y navegador. No hay operaciones financieras sin conexión; el acceso con Privy y las estadísticas requieren internet." },
];

export function Faq({ preview = false }: { preview?: boolean }) {
  return <section aria-label="Preguntas frecuentes" className={preview ? "mt-12 border-t border-border pt-8" : ""}>
    {preview && <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">Preguntas frecuentes</h2><Link to="/faq" className="text-sm text-primary underline">Ver todas</Link></div>}
    <Accordion type="multiple" className="w-full">
      {(preview ? questions.slice(0, 7) : questions).map(({ question, answer }, index) => <AccordionItem key={question} value={`faq-${index}`}>
        <AccordionTrigger className="gap-4 font-display text-foreground">{question}</AccordionTrigger>
        <AccordionContent className="max-w-2xl text-sm leading-7 text-muted-foreground">{answer}</AccordionContent>
      </AccordionItem>)}
    </Accordion>
    {!preview && <p className="mt-8 break-all text-xs leading-6 text-muted-foreground">Wallet prevista para futuros cargos operativos (sin transferencias habilitadas): <span className="font-mono">{FEE_WALLET}</span></p>}
  </section>;
}