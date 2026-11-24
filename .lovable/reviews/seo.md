# Revisión de la portada

Google tiene la portada principal indexada y la visitó por última vez el 23 de noviembre de 2026 a las 22:36 UTC. Esto no confirma que haya leído los cambios posteriores ni permite ver el texto exacto que guardó.

Las seis direcciones de portadas (/bitcoin, /trump, /gta6, /sin-ansiedad, /doble-o-nada y /clasica) aparecen como «URL desconocida para Google». El mapa de páginas fue descargado el 24 de noviembre a las 02:21 UTC y no reporta errores ni advertencias; esto no demuestra que las seis direcciones estén incluidas o indexadas.

La advertencia de idioma provenía de una revisión desactualizada. El 24 de noviembre se comprobó que el código y el HTML publicado ya declaran el idioma correctamente: `es` en `/` y `/bitcoin`, y `en` en `/en` y `/en/bitcoin`. Las mismas cuatro comprobaciones dieron el resultado esperado en la vista previa. No fue necesario cambiar las páginas ni volver a publicar.

La advertencia se registra como corregida, pendiente de que la próxima revisión vuelva a comprobarla; esto no confirma una nueva visita de Google.

| Finding | Level | State |
| --- | --- | --- |
| Some basic page setup is missing | low | fixed |
| Home page is reachable | low | passing |
| AI assistants can see your site as markdown | low | passing |
| Search engines see your fully-rendered pages | low | passing |
| Crawler rules look good | low | passing |
| Sitemap looks good | low | passing |
| Site icon is set up for search | low | passing |
| Home page search metadata is set | low | passing |
| Social preview basics are set | low | passing |

Estas consultas leen el estado registrado por Google: no solicitan una nueva visita ni indexación.

## Comprobación ampliada del idioma

Regla: cada página debe declarar el idioma de su contenido para los buscadores y herramientas de accesibilidad.

Se leyeron las declaraciones de todas las páginas y el contenedor común `__root.tsx`, además de `seo-lang.ts`, `i18n.tsx` y `language-menu.tsx`. Se solicitaron las 44 páginas de la vista previa sin iniciar sesión: todas respondieron HTTP 200 con el idioma esperado en el HTML inicial.

| Lugares revisados | Resultado |
| --- | --- |
| `/`, `/bitcoin`, `/trump`, `/gta6`, `/sin-ansiedad`, `/doble-o-nada`, `/clasica` | HTML inicial en español: correcto |
| `/faq`, `/guias/`, `/guias/bovedas-alto-rendimiento`, `/guias/ganar-intereses-bitcoin`, `/guias/invertir-sin-estafas`, `/guias/mercados-de-prediccion`, `/guias/que-es-usdc`, `/guias/recargar-con-coinbase`, `/guias/retirar-cash-app-bitcoin` | HTML inicial en español: correcto |
| `/terminos`, `/privacidad`, `/status` | HTML inicial en español: correcto |
| `/app`, `/portfolio`, `/wallet`, `/mercados`, `/cuenta`, `/seguridad`, `/invita`, `/notificaciones`, `/actividad`, `/admin`, `/prueba` | HTML inicial sin sesión en español: correcto; no se comprobaron operaciones privadas ni se modificó el acceso |
| `/en/`, `/en/bitcoin`, `/en/faq`, `/en/guides/`, `/en/guides/add-dollars-with-coinbase`, `/en/guides/avoid-investment-scams`, `/en/guides/earn-interest-on-bitcoin`, `/en/guides/high-yield-vaults`, `/en/guides/prediction-markets`, `/en/guides/what-is-usdc`, `/en/guides/withdraw-to-cash-app-bitcoin`, `/en/privacy`, `/en/status`, `/en/terms` | HTML inicial en inglés: correcto |
| Selector y navegación | Prueba en celular 390×844: FAQ en español → elegir English → Términos; el contenido y la declaración permanecieron en inglés |
| Página de error de emergencia | Código leído: contenido en inglés y `lang="en"`; correcto, sin forzar una caída |
| Vista previa de correos de acceso | Código y seis plantillas leídos: signup, invite, magic-link, recovery, email-change y reauthentication declaran inglés; no se enviaron correos |
| Tareas automáticas de estado, market-pulse, promo-post y weekly-summary; webhook de Telegram | Código leído: no generan documentos HTML de páginas, por lo que esta advertencia no aplica; no se ejecutaron tareas |
| Sitemap y funciones de datos | El sitemap entrega XML, no una página HTML; la declaración de idioma pertenece al contenedor de las páginas, no a los registros o funciones de datos |

En el dominio publicado se comprobaron directamente `/`, `/bitcoin`, `/en` y `/en/bitcoin`; no se afirma haber solicitado allí las otras 40 páginas. No se hallaron otras páginas sin declaración de idioma. No se cambiaron permisos, preferencias, datos de ejemplo ni registros financieros. La advertencia sigue pendiente de verificación por el próximo escaneo, y estas pruebas no solicitan una nueva visita o indexación de Google.