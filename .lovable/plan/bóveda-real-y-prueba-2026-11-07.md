# BÓVEDA: Real y Prueba

## Resultado
Ofrecer dos modos claramente separados en la misma aplicación:
- **Real:** USDC y posiciones verificadas en Solana, con autorización de la wallet para cada operación.
- **Prueba:** 1,000 créditos ficticios por usuario nuevo, con depósitos, cosechas y liquidaciones simulados. Los créditos nunca se convierten en USDC reales ni se transfieren a Real.

El acceso con Privy ya existe. Los movimientos financieros actuales son simulaciones; cambiar los textos no los convierte en operaciones reales.

## 1. Separar los dos modos
- Añadir un selector visible **Real / Prueba** antes y después del acceso.
- Mantener las posiciones y créditos de Prueba separados por usuario de Privy y conservar las pruebas existentes.
- Real no heredará el saldo inicial, las posiciones locales ni las ganancias calculadas de Prueba.
- Hasta completar y verificar la integración, Real mostrará **Operaciones aún no disponibles**, sin botones que puedan recibir fondos ni cifras financieras inventadas.

## 2. Conectar las operaciones reales
- Usar la wallet Solana de Privy, Phantom o Jupiter Wallet; mostrar la dirección activa y consultar su saldo real de USDC y SOL.
- Integrar los tres pools indicados de Meteora DAMM v2, verificando sus direcciones, tokens y compatibilidad antes de permitir depósitos.
- Preparar depósitos desde USDC. Si el pool requiere otro token, incluir una cotización de conversión y el límite de deslizamiento en la revisión.
- Recuperar posiciones desde Solana y verificar su titularidad; el navegador no será la fuente de verdad del capital ni las ganancias reales.
- **Cosechar Ganancias:** retirar las comisiones disponibles sin retirar la liquidez principal; convertir lo necesario a USDC con una cotización revisada.
- **Cerrar y Liquidar:** retirar la liquidez y convertir los activos a USDC según la cotización aceptada, sin prometer recuperar el importe depositado.
- Mostrar revisión, firma, envío, confirmación y errores. Guardar el identificador de transacción y comprobar el resultado en Solana antes de marcar una operación como completada.
- Gestionar cancelación, fondos insuficientes, cotizaciones vencidas, transacciones pendientes y fallos sin duplicar acciones.

## 3. Cobrar el 1% real
- Mantener el 1% en USDC descontado del importe bruto: depósito, ganancias cosechadas o resultado bruto de liquidación, respectivamente.
- Enviar el cargo a la wallet ya especificada por el operador, no a una nueva dirección.
- Calcular importes con unidades enteras y seis decimales; presentar bruto, cargo, neto y costes de red/intercambio por separado.
- Diseñar el cargo y la operación para evitar un cobro aislado cuando la operación falla. Si una secuencia no puede ser atómica, revisar esa limitación antes de habilitarla.
- Prueba conservará el mismo desglose, pero no enviará ningún cargo real.

## 4. Actualizar toda la documentación
- Actualizar inicio, catálogo, confirmaciones, pie de página y descripción de instalación para Real y Prueba.
- Reescribir términos y privacidad para cubrir wallets, autorización, conversiones, datos públicos en blockchain, comisiones, riesgos, servicios externos y separación de modos.
- Actualizar las FAQ: cambio de modo, 1,000 créditos, USDC en Solana, SOL para red, depósitos, cosechas, liquidaciones, 1%, deslizamiento, transacciones pendientes y recuperación de posiciones.
- Mantener estadísticas de DexScreener y URLs de Meteora solo para copiar.
- Mostrar los APY ilustrativos únicamente en Prueba; en Real no presentar tasas ni ganancias inventadas.
- Mantener tono de producto lanzado, pero reflejar la disponibilidad efectiva. No afirmar que hay transferencias reales hasta que estén habilitadas.

## Detalles técnicos
- Mantener TanStack Start y el acceso Privy existente; usar los SDK oficiales de Meteora y Privy para la lógica financiera.
- Usar cotizaciones y transacciones de Jupiter para conversiones necesarias, con validación de tokens, destinatarios y límites antes de firmar.
- Mantener claves y servicios privados fuera del navegador. Verificar sesiones Privy en cualquier función protegida; no sustituirlas por almacenamiento local ni por sesiones de otro proveedor.
- Aislar módulos de Prueba y Real, consultas y controles de ejecución; añadir pruebas concretas de créditos, separación, cálculo del 1% y restricciones de autorización.
- Configurar servicios de Solana y de cotización antes de depender de ellos; solicitar credenciales mediante formularios seguros si se requieren.

## Verificación y condiciones de activación
- Probar Prueba de principio a fin y comprobar que nunca firma ni envía transacciones.
- Simular operaciones reales, comprobar el destino del cargo y verificar cancelaciones, fallos y recuperación.
- Verificar una operación de importe pequeño aprobada expresamente por el propietario, con lectura posterior de saldo, posición y cargo en Solana; no mover dinero durante el desarrollo sin esa autorización.
- Comprobar escritorio, móvil y documentación pública.
- Activar los botones de dinero real solo después de superar estas comprobaciones.

## Pendientes externos
- Autorizar los dominios necesarios en Privy y disponer de una wallet que pueda aprobar las pruebas reales.
- Configurar acceso fiable a Solana y servicios de cotización, con credenciales si las requieren.
- El operador debe proporcionar dirección legal, canal de privacidad y jurisdicción aplicable; someter los textos a revisión legal antes del lanzamiento financiero.

La entrega inicial separa los modos y actualiza la documentación con el estado correcto. El modo Real operativo requiere completar la integración y las verificaciones anteriores; no se publicará automáticamente ni se presentará como listo por cambiar el nombre.