# Hotel Perico — conexión inicial con Supabase

## Archivos
- `index.html`: formulario con textos actualizados.
- `script.js`: consulta disponibilidad y envía solicitudes mediante las funciones RPC de Supabase.
- `supabase-config.js`: URL del proyecto y espacio para la clave pública.
- `style.css`: conservar el archivo de estilos que ya tenías si no está incluido en este paquete.

## Antes de probar
1. Abrí `supabase-config.js`.
2. Reemplazá `PEGÁ_ACÁ_TU_CLAVE_sb_publishable` por tu clave `sb_publishable_...`.
3. Confirmá que `index.html`, `script.js`, `supabase-config.js` y `style.css` estén en la misma carpeta.
4. Serví/publicá el sitio por HTTPS para probarlo; no uses `file://` como URL final.

## Qué hace esta versión
- Consulta la función `consultar_disponibilidad`.
- Envía solicitudes mediante `solicitar_reserva`.
- Muestra los errores de Supabase en la página.
- No guarda las reservas nuevas en localStorage.

## Límites actuales
- Todavía no se ha conectado ni asegurado el panel administrativo.
- Las reservas quedan pendientes; no se envían emails ni se procesan pagos.
- La función SQL de reserva actual no calcula el importe final ni guarda comentarios del huésped.
- Antes de producción conviene revisar límites de frecuencia, validación de entrada y permisos, además de probar casos de concurrencia.
