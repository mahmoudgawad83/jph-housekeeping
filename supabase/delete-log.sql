-- Run once in Supabase → SQL Editor (lets admins delete observations, with a deletion log). Safe to run again.
-- ───────────────────────── Deleting observations (admins) + deletion log ─────────────────────────
-- Admins can delete an observation from the app. The Google Drive copy of the photo is kept.
-- Every deletion is logged with who, when and a full copy of the observation.
create table if not exists public.deleted_observations (
  id bigserial primary key,
  observation_id uuid not null,
  bloc_id int,
  deleted_by uuid references public.profiles(id),
  deleted_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.deleted_observations enable row level security;
drop policy if exists deleted_obs_read on public.deleted_observations;
create policy deleted_obs_read on public.deleted_observations for select to authenticated using (public.is_admin());
grant select on public.deleted_observations to authenticated;
grant all on public.deleted_observations to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.log_observation_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.deleted_observations (observation_id, bloc_id, deleted_by, data)
  values (old.id, old.bloc_id, auth.uid(), to_jsonb(old));
  return old;
end $$;
drop trigger if exists observations_delete_log on public.observations;
create trigger observations_delete_log before delete on public.observations
for each row execute function public.log_observation_delete();

-- Admins may remove the app's temporary photo copies.
drop policy if exists photos_admin_delete on storage.objects;
create policy photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
