HOTEL PERICO — PANEL ADMIN CON SUPABASE

1. Reemplazá admin.html y admin.js por los archivos de esta carpeta.
2. Dejá ambos junto a style.css y supabase-config.js.
3. En Supabase > Authentication > Users, creá manualmente un usuario administrador con email y contraseña. No habilites el registro público.
4. Ejecutá supabase-admin-policies.sql en SQL Editor. Revisá que no existan políticas más permisivas que den acceso anónimo a reservas.
5. Confirmá que los nombres de columnas de public.reservas sean: id, habitacion_id, nombre_huesped (o nombre), email, telefono, fecha_entrada, fecha_salida, cantidad_huespedes (o huespedes), estado, created_at. El código contempla alias frecuentes para mostrar algunos campos, pero la consulta espera created_at.
6. Abrí admin.html mediante Live Server e iniciá sesión con el usuario creado en Supabase Auth.

IMPORTANTE:
- El código no usa service_role; solo la clave publishable y el token de sesión.
- El SQL da permisos a cualquier usuario autenticado. Esto es seguro únicamente si el registro público está deshabilitado y los usuarios se crean manualmente por el propietario. Para una instalación multiusuario, hay que implementar un rol admin explícito.
- La estructura exacta de columnas puede variar. Si la tabla reservas usa nombres diferentes, el error de Supabase indicará qué ajustar.
- La exportación se descarga como CSV compatible con Excel.
