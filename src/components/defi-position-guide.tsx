import { Eye, KeyRound, SlidersHorizontal, ShieldAlert, ArrowDown } from "lucide-react";
import { GuideLayout, type GuideEn } from "@/components/guide-layout";

const TITLE = "Cómo verificar y gestionar tu posición en Meteora fuera de Bóveda";
const INTRO = "Una guía avanzada para personas con conocimientos básicos de DeFi (finanzas descentralizadas). Bóveda Market es una interfaz que conecta tu billetera con pools públicos de liquidez y ofrece el Piloto Automático; no custodia tus depósitos ni es dueña de los pools.";

function PositionBody({ en = false }: { en?: boolean }) {
  const choose = (es: string, english: string) => en ? english : es;
  return <>
    <aside className="border-l-4 border-destructive bg-destructive/5 px-4 py-3" aria-label={choose("Advertencia de gestión externa", "External management warning")}>
      <h2 className="flex items-center gap-2"><ShieldAlert size={20} className="shrink-0 text-destructive" />{choose("Transparencia, no una recomendación", "Transparency, not a recommendation")}</h2>
      <p>{choose("La opción recomendada es gestionar tus bóvedas inteligentes desde Bóveda Market. Esta guía explica cómo verificar por tu cuenta y qué riesgos asumes si decides operar fuera. No necesitas revelar tu llave privada para comprobar una posición.", "The recommended option is to manage your smart vaults through Bóveda Market. This guide explains independent verification and the risks of operating elsewhere. You do not need to reveal your private key to verify a position.")}</p>
    </aside>

    <section>
      <h2>{choose("1. Entiende qué estás verificando", "1. Understand what you are verifying")}</h2>
      <p>{choose("Tu depósito aporta liquidez a un pool de Meteora en Solana. La posición registra el propietario, el pool, el rango y la liquidez aportada. En DLMM, se trata de una cuenta de posición: no asumas que siempre aparecerá como un NFT en tu billetera.", "Your deposit provides liquidity to a Meteora pool on Solana. The position records its owner, pool, range and supplied liquidity. In DLMM, this is a position account: do not assume it will always appear as an NFT in your wallet.")}</p>
      <p className="mt-3">{choose("Los intereses proceden de la actividad de intercambios del pool. Bóveda facilita el acceso y la automatización; no garantiza beneficios ni elimina el riesgo del protocolo, de los tokens o de pérdida impermanente.", "Interest comes from trading activity in the pool. Bóveda provides access and automation; it does not guarantee profits or remove protocol, token or impermanent-loss risk.")}</p>
    </section>

    <section>
      <h2>{choose("2. Verifica sin exportar llaves", "2. Verify without exporting keys")}</h2>
      <ol className="space-y-2">
        <li>{choose("Copia tu dirección pública desde Billetera → Recibir. No es tu llave privada y puedes usarla para consultar el explorador.", "Copy your public address from Wallet → Receive. This is not your private key and can be used to look up the explorer.")}</li>
        <li>{choose("En los detalles de tu bóveda inteligente, revisa «Dirección del pool». El enlace de Solscan identifica el pool completo, no demuestra por sí solo tu depósito personal.", "In your smart vault details, check “Pool address”. The Solscan link identifies the entire pool; by itself it does not prove your individual deposit.")}</li>
        <li>{choose("Consulta tu dirección y los recibos de depósito en solscan.io. Identifica la cuenta de posición y compara su propietario y su pool exacto. No te guíes solo por el nombre o el símbolo de la moneda.", "Look up your address and deposit transaction receipts on solscan.io. Identify the position account and compare its owner and exact pool. Do not rely only on a coin name or ticker.")}</li>
      </ol>
      <p className="mt-3">{choose("Los saldos de tokens de la billetera no incluyen necesariamente la liquidez depositada. El explorador puede no mostrar todos los campos de forma sencilla; consulta la documentación oficial o el pool en Meteora si necesitas interpretar la posición.", "Wallet token balances do not necessarily include deposited liquidity. The explorer may not display every field clearly; consult official documentation or the pool on Meteora to interpret the position.")}</p>
    </section>

    <figure className="border-y border-border py-5">
      <figcaption className="mb-4 font-semibold text-foreground">{choose("Verificar no es lo mismo que operar", "Verifying is not the same as operating")}</figcaption>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Eye, title: choose("Dirección pública", "Public address"), text: choose("Consultar. Sin llave ni firma.", "View. No private key or signature.") },
          { icon: KeyRound, title: choose("Llave privada", "Private key"), text: choose("Control de la misma billetera.", "Control of the same wallet.") },
          { icon: SlidersHorizontal, title: choose("Gestión externa", "External management"), text: choose("Operaciones manuales, bajo tu responsabilidad.", "Manual operations, your responsibility.") },
        ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-3"><Icon size={22} className="mt-1 shrink-0 text-primary" aria-hidden /><div><p className="font-semibold text-foreground">{title}</p><p className="text-xs leading-5">{text}</p></div></div>)}
      </div>
    </figure>

    <section>
      <h2>{choose("3. El Piloto Automático se mantiene", "3. Autopilot stays enabled")}</h2>
      <p><strong>{choose("Exportar o importar la llave no desactiva automáticamente el Piloto Automático ni elimina tu cuenta de Bóveda.", "Exporting or importing the key does not automatically disable Autopilot or delete your Bóveda account.")}</strong></p>
      <p className="mt-3">{choose("Si estaba activo, sigue activo en Bóveda para las posiciones compatibles de esa misma billetera. Consultar tu posición en Meteora o abrir la billetera en Phantom o Jupiter Wallet no lo desconecta. No necesitas apagarlo para verificar.", "If it was enabled, it remains enabled in Bóveda for compatible positions in that same wallet. Viewing your position on Meteora or opening the wallet in Phantom or Jupiter Wallet does not disconnect it. You do not need to turn it off to verify.")}</p>
      <p className="mt-3">{choose("El Piloto Automático sigue funcionando desde Bóveda Market: no se instala ni se administra desde la otra app. Si decides cambiar rangos, retirar liquidez o cerrar una posición manualmente, evita hacerlo mientras haya una operación automática en curso. Para evitar interferencias, puedes pausarlo desde Bóveda antes de operar; importar la llave por sí solo no lo pausa.", "Autopilot continues running through Bóveda Market: it is not installed or managed in the other app. If you choose to change ranges, withdraw liquidity or close a position manually, avoid doing so while an automatic operation is in progress. To avoid conflicts, you can pause it in Bóveda before operating; importing the key alone does not pause it.")}</p>
    </section>

    <section>
      <h2>{choose("4. Importa la misma billetera, solo si lo necesitas", "4. Import the same wallet, only if needed")}</h2>
      <p>{choose("En Bóveda: Billetera → Avanzado → Ver mi llave privada. La pantalla segura de exportación puede pedirte verificar tu identidad. Si ya usas una billetera externa, tu llave se administra en esa app.", "In Bóveda: Wallet → Advanced → View my private key. The secure export screen may ask you to verify your identity. If you already use an external wallet, its key is managed in that app.")}</p>
      <ol className="mt-3 space-y-2">
        <li>{choose("Instala Phantom desde su sitio oficial, phantom.com. En móvil: perfil → Settings → Manage Accounts → + → Import Private Key. Selecciona Solana e importa la llave dentro de la app oficial.", "Install Phantom from its official site, phantom.com. On mobile: profile → Settings → Manage Accounts → + → Import Private Key. Select Solana and import the key inside the official app.")}</li>
        <li>{choose("En Jupiter Wallet, Solflare u otra billetera compatible, consulta sus instrucciones oficiales y comprueba que acepte el formato de llave exportado. Las opciones y los nombres pueden variar según la versión.", "For Jupiter Wallet, Solflare or another compatible wallet, check its official instructions and confirm it accepts the exported key format. Options and labels may vary by version.")}</li>
        <li><strong>{choose("Compara la dirección completa de la cuenta importada con la de Bóveda. Si no coincide, detente.", "Compare the imported account’s full address with your Bóveda address. If it does not match, stop.")}</strong> {choose("Importar la llave abre acceso a la misma billetera; no mueve fondos ni crea una posición nueva.", "Importing the key gives access to the same wallet; it does not move funds or create a new position.")}</li>
      </ol>
      <p className="mt-3 border-l-2 border-destructive pl-3">{choose("Nunca envíes la llave a soporte, Sofía ni otra persona. No la pegues en Meteora, exploradores, chats, formularios web o conversores de llaves. No guardes capturas ni copias en correo o almacenamiento compartido. La llave privada no es una frase de recuperación y no debes intentar convertirla con sitios de terceros.", "Never send the key to support, Sofía or anyone else. Do not paste it into Meteora, explorers, chats, web forms or key converters. Do not keep screenshots or copies in email or shared storage. A private key is not a recovery phrase; do not try to convert it using third-party sites.")}</p>
      <p className="mt-3">{choose("La protección de acceso y la doble verificación de Bóveda no protegen las firmas realizadas desde una copia de la llave en otra app. Si alguien obtiene la llave, puede controlar tus fondos.", "Bóveda’s sign-in protection and two-factor verification do not protect signatures made using a copy of the key in another app. Anyone who obtains the key can control your funds.")}</p>
    </section>

    <section>
      <h2>{choose("5. Localiza y revisa tu posición en Meteora", "5. Locate and review your position on Meteora")}</h2>
      <ol className="space-y-2">
        <li>{choose("Escribe meteora.ag directamente y abre su aplicación oficial. Evita anuncios, enlaces recibidos por mensaje y dominios parecidos. Conectar una billetera no requiere entregar la llave privada al sitio.", "Type meteora.ag directly and open its official app. Avoid ads, links sent in messages and lookalike domains. Connecting a wallet does not require giving the site your private key.")}</li>
        <li>{choose("Conecta la cuenta importada y abre el pool DLMM por su dirección exacta. Revisa las posiciones de esa cuenta en el pool; los menús pueden cambiar con las actualizaciones.", "Connect the imported account and open the DLMM pool by its exact address. Review that account’s positions in the pool; menus may change with updates.")}</li>
        <li>{choose("Comprueba el propietario, la dirección de posición, los tokens, la liquidez, el rango de bins y los intereses pendientes. El valor estimado en dólares cambia con el precio y no equivale necesariamente al importe final de una salida.", "Check the owner, position address, tokens, liquidity, bin range and pending fees. Estimated dollar value changes with price and does not necessarily equal the final withdrawal amount.")}</li>
      </ol>
      <p className="mt-3">{choose("Si no aparece la posición, revisa primero la cuenta conectada y el pool exacto. No deposites de nuevo ni firmes una transacción para «desbloquear» o «sincronizar» fondos.", "If the position does not appear, first check the connected account and exact pool. Do not deposit again or sign a transaction to “unlock” or “sync” funds.")}</p>
    </section>

    <section>
      <h2>{choose("6. Qué asumes al gestionar manualmente", "6. What manual management involves")}</h2>
      <ul className="space-y-2">
        <li>{choose("Vigilar el rango, el precio y la pérdida impermanente; elegir cuándo cobrar intereses, retirar o rebalancear. Salir de rango puede detener la generación de intereses por intercambios.", "Monitor range, price and impermanent loss; decide when to claim fees, withdraw or rebalance. Moving out of range may stop earning trading fees.")}</li>
        <li>{choose("Mantener SOL para las tarifas de red y revisar cada firma, el deslizamiento y las cantidades mínimas. Una salida puede devolverte los dos tokens del pool, no solo dólares digitales; cualquier cambio posterior es una operación aparte.", "Keep SOL for network fees and review each signature, slippage and minimum amounts. A withdrawal may return both pool tokens, not only digital dollars; any later swap is a separate operation.")}</li>
        <li>{choose("Comprobar el estado de la posición después de cambios externos: puede dejar de ser compatible con la gestión de Bóveda. Si cierras una posición, ya no queda liquidez en ella que el Piloto Automático pueda gestionar, aunque el servicio siga activo para otras posiciones compatibles.", "Check the position state after external changes: it may no longer be compatible with Bóveda’s management. If you close a position, no liquidity remains in it for Autopilot to manage, even if the service stays enabled for other compatible positions.")}</li>
      </ul>
      <p className="mt-4"><strong>{choose("Las operaciones externas las decides y autorizas tú.", "You decide and authorize external operations.")}</strong> {choose("Bóveda Market no ejecuta ni supervisa esas operaciones manuales, no puede revertir transacciones confirmadas y no asume responsabilidad por errores, exposición de llaves, estafas o pérdidas derivados de tu gestión externa, sin perjuicio de los derechos y responsabilidades que establezca la ley aplicable.", "Bóveda Market does not execute or supervise those manual operations, cannot reverse confirmed transactions and does not assume responsibility for errors, exposed keys, scams or losses arising from your external management, without limiting rights and responsibilities under applicable law.")}</p>
    </section>

    <section className="border-t border-border pt-5">
      <h2>{choose("Documentación oficial para contrastar", "Official documentation to cross-check")}</h2>
      <ul>
        <li><a href="https://docs.meteora.ag/core-products/dlmm/dynamic-positions" target="_blank" rel="noopener noreferrer" className="text-primary underline">{choose("Meteora: cuentas de posición DLMM", "Meteora: DLMM position accounts")}</a></li>
        <li><a href="https://docs.meteora.ag/user-guides/how-to-use-dlmm/dynamic-terminal" target="_blank" rel="noopener noreferrer" className="text-primary underline">{choose("Meteora: consultar y gestionar posiciones", "Meteora: viewing and managing positions")}</a></li>
        <li><a href="https://help.phantom.com/articles/add-another-wallet-to-phantom-28355310978067" target="_blank" rel="noopener noreferrer" className="text-primary underline">{choose("Phantom: importar una llave privada", "Phantom: importing a private key")}</a></li>
      </ul>
      <p className="mt-3 flex items-start gap-2"><ArrowDown size={16} className="mt-1 shrink-0 text-primary" aria-hidden />{choose("Si solo quieres verificar, vuelve al paso 2: tu dirección pública basta para empezar, sin exponer la llave.", "If you only want to verify, return to step 2: your public address is enough to start, without exposing your key.")}</p>
    </section>
  </>;
}

const EN: GuideEn = {
  title: "How to verify and manage your Meteora position outside Bóveda",
  intro: "An advanced guide for people with basic DeFi (decentralized finance) knowledge. Bóveda Market is an interface connecting your wallet to public liquidity pools and providing Autopilot; it does not custody your deposits or own the pools.",
  body: <PositionBody en />,
};

export function DefiPositionGuide() {
  return <GuideLayout current="/guias/verificar-posicion-meteora" title={TITLE} intro={INTRO} minutes={7} en={EN}><PositionBody /></GuideLayout>;
}