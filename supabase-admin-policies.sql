-- Hotel Perico: políticas para el panel de administración.
-- Ejecutar solo después de crear el usuario administrador en Supabase Auth.
-- Como el proyecto tiene deshabilitado el registro público, cualquier usuario autenticado
-- será un usuario creado manualmente por el propietario. Verificá que Sign-ups esté deshabilitado.

grant usage on schema public to authenticated;
grant select, update on table public.reservas to authenticated;
grant select on table public.habitaciones to authenticated;

alter table public.reservas enable row level security;
alter table public.habitaciones enable row level security;

drop policy if exists "Admin autenticado puede leer reservas" on public.reservas;
create policy "Admin autenticado puede leer reservas"
on public.reservas for select to authenticated
using (auth.uid() is not null);

drop policy if exists "Admin autenticado puede actualizar reservas" on public.reservas;
create policy "Admin autenticado puede actualizar reservas"
on public.reservas for update to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "Admin autenticado puede leer habitaciones" on public.habitaciones;
create policy "Admin autenticado puede leer habitaciones"
on public.habitaciones for select to authenticated
using (auth.uid() is not null);

NOTIFY pgrst, 'reload schema';
