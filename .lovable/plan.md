# Seguridad nerd, orden del Portafolio, Piloto automático y «Por reclamar»

## 1. Tarjeta «Por qué tus fondos están seguros» (Opción 2)
Justo después de «BÓVEDA funciona distinto.» se agrega el párrafo:
> «Opera bajo autocustodia criptográfica pura. Cada transacción requiere una firma matemática generada únicamente por tu llave privada desde tu dispositivo. BÓVEDA no custodia tu capital ni almacena tus claves; tus fondos interactúan de forma directa con contratos inmutables y descentralizados en la cadena de bloques. Nadie, ni siquiera nosotros, tiene la capacidad matemática de tocar o mover un solo centavo sin tu firma.»
Con traducción al inglés.

## 2. Nuevo orden en Portafolio
1. Intereses de la semana (gráfica)
2. Tu rendimiento (capital trabajando, por cosechar, ganancias)
3. Tus posiciones (bóvedas)

## 3. Piloto automático con tono nerd y nativo (sugerencia)
Presentarlo como el «motor» propio de BÓVEDA, no como un bot externo. Título: **«⚙️ Motor BÓVEDA · Piloto automático»**.
- «🛰️ Nuestro algoritmo detectó que el precio salió de tu zona y recalibró tu posición en un solo bloque.»
- «🧬 Ganancias recompuestas: +$X.XX se fusionaron con tu capital y ya están generando interés compuesto.»
- «📊 Tu contador volvió a 0 porque esas ganancias ahora son parte de tu depósito, no porque se perdieran.»
- «🔐 Ejecutado con tu autorización previa; tus fondos nunca salieron de tu bóveda.»
Se aplica a Telegram y a la campanita (ES/EN). Sin hablar de comisiones ni pérdidas.

## 4. «Por reclamar» en Mi Billetera sin que parezca que desapareció el dinero
Problema: cuando el Piloto cosecha, «Por reclamar» baja a $0 sin explicación.
Solución combinada:
- **Recordar la última reinversión:** si el contador está en $0 y hubo rebalanceo reciente (7 días), la píldora cambia a «✨ +$17.06 reinvertidos en tu bóveda · hace 2 h» en vez de desaparecer.
- **Etiqueta más clara:** «Ganancias por cosechar» en lugar de «Por reclamar · se suma al reclamar».
- **Mini explicación al tocar:** «El Piloto automático cosecha y suma tus ganancias a tu capital. Por eso este número vuelve a 0 y tu saldo en la bóveda sube.»
- Al tocar la píldora sigue llevando a Portafolio, donde la gráfica ya muestra esas ganancias.

## Detalles técnicos
- security-why.tsx: párrafo nuevo + i18n.
- real-overview.tsx: renderizar PortfolioSummary antes de RealPositions; en portfolio-summary.tsx mover WeeklyChart al inicio de la sección.
- autopilot.ts: reescribir autopilotDoneText (ambas ramas) y el texto de la campanita; actualizar pruebas existentes de autopilot.
- wallet-panel.tsx: leer lastRebalanceAt/lastGainsUsd del estado de Piloto ya disponible para la campanita; mostrar píldora de reinversión cuando unclaimed < 0.01.
