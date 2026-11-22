# Panel de Control más claro + sección de Usuarios

## Qué cambia para ti

### 1. Una portada del panel («Resumen») al entrar
En lugar de caer directo en Finanzas, lo primero que ves son tarjetas con las cifras clave y lo que necesita atención:
- **Conectados ahora**, **usuarios activos hoy** y **cuentas nuevas en 7 días**
- **Pagos de socios pendientes** (monto y cantidad)
- **Reserva de la tesorería** (aviso si está baja)
- **Mensajes sin leer** en el buzón y sugerencias nuevas
- **Estado del sistema** (todo bien / algún servicio con fallas)

Cada tarjeta es un atajo: al tocarla te lleva directo a la sección donde se resuelve.

### 2. Menú ordenado por tareas
- En computadora: un menú fijo a la izquierda que siempre está a la vista.
- En celular: una barra de secciones arriba que se desliza, siempre visible al bajar.
- Cada sección muestra un puntito o número cuando hay algo pendiente.
- El panel recuerda la última sección abierta y cada sección tiene su propio enlace, así puedes volver directo.

Secciones:
1. Resumen
2. Usuarios (nueva)
3. Finanzas y Afiliados
4. Comunicaciones
5. Seguridad y Estado
6. Vista previa

### 3. Sección nueva: Usuarios
- **Conectados ahora**: cuántas personas tienen la app abierta en este momento (con sesión y visitantes, por separado).
- **Lista de cuentas**: nombre o correo, fecha de registro, última vez que entró, si ya depositó, si tiene Telegram conectado y si tiene piloto automático. Con buscador y filtros: «Conectados», «Nuevos», «Sin depósito», «Con bóveda».
- **Embudo simple**: cuentas creadas → recargaron dólares → hicieron su primer depósito.
- Tocar un usuario abre su ficha con sus datos de contacto y un enlace para copiar su dirección de cartera.

Solo la cartera de tesorería puede ver esto; nadie más tiene acceso a esa información.

## Detalles técnicos
- Presencia: la app abierta envía cada 60 s un aviso de actividad a una función del servidor. Con sesión, el servidor verifica el token de Privy (ES256/JWKS) y guarda `last_seen` por identidad de Privy en una tabla privada con RLS cerrada. Los visitantes se cuentan con un identificador anónimo del navegador, sin datos personales. «Conectado» = actividad en los últimos 2 min. Los visitantes anónimos se borran pasadas 24 h.
- Lista de cuentas: la función de administración, tras verificar que quien llama es la tesorería, combina la API de usuarios de Privy (con el secreto existente) con las tablas `account_profiles`, `coinbase_onramps`, `telegram_links`, `autopilot_enrollments` y `verified_wallets`. Va paginada y nunca devuelve tokens.
- Contadores del Resumen: un solo servidor agrupa los totales que ya calculan los módulos actuales (pagos, buzón, sugerencias, estado), con caché corta.
- Navegación: sección guardada en la URL (`/admin?s=usuarios`) y en el almacenamiento local. Los módulos siguen cargándose solo cuando se abren.
- Se diseña primero para celular y luego para escritorio. Se prueba con capturas en ambos tamaños.
