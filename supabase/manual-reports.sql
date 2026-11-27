-- Run once in Supabase → SQL Editor (manual reports from the app + Word format). Safe to run again.
-- Needs supabase/hourly-trigger.sql (the GitHub token) to have been run first.
-- ───────────────────────── Manual reports (admin) + Word format ─────────────────────────
-- Report files: 'pdf', 'docx' (Word) or 'both'. Reports table keeps the Word link too.
alter table public.settings add column if not exists report_formats text not null default 'both';
do $$ begin
  alter table public.settings add constraint settings_report_formats_chk check (report_formats in ('pdf','docx','both'));
exception when duplicate_object then null; end $$;
alter table public.reports add column if not exists docx_link text;

-- An admin asks for a report from the app; the database immediately asks GitHub to run the report engine.
create table if not exists public.report_requests (
  id bigserial primary key,
  created_by uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  bloc_id int references public.blocs(id) on delete cascade,   -- null = all Blocs
  type text not null check (type in ('daily','weekly')),
  period_date date not null default current_date,
  send_email boolean not null default false,
  status text not null default 'queued',                       -- queued / running / done / error
  result jsonb, error text, updated_at timestamptz not null default now()
);
alter table public.report_requests enable row level security;
drop policy if exists report_requests_admin on public.report_requests;
create policy report_requests_admin on public.report_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert on public.report_requests to authenticated;
grant all on public.report_requests to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

create or replace function public.dispatch_report_request() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare tok text; bname text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if tok is null then
    update public.report_requests set status = 'error', error = 'Timer token missing (run supabase/hourly-trigger.sql)', updated_at = now() where id = new.id;
    return new;
  end if;
  select name into bname from public.blocs where id = new.bloc_id;
  perform net.http_post(
    url := 'https://api.github.com/repos/mahmoudgawad83/jph-housekeeping/actions/workflows/reports.yml/dispatches',
    headers := jsonb_build_object('Authorization', 'Bearer ' || tok, 'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'jph-housekeeping-app'),
    body := jsonb_build_object('ref', 'main', 'inputs', jsonb_build_object(
      'force', new.type, 'bloc', coalesce(bname, ''), 'date', to_char(new.period_date, 'YYYY-MM-DD'),
      'request_id', new.id::text, 'send_email', case when new.send_email then 'true' else 'false' end)));
  return new;
end $$;
drop trigger if exists report_requests_dispatch on public.report_requests;
create trigger report_requests_dispatch after insert on public.report_requests
for each row execute function public.dispatch_report_request();

-- ───────────────────────── Keep at least one active administrator ─────────────────────────
-- Refuses deleting, demoting or deactivating the last active admin (from the app or the database).
create or replace function public.protect_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active)
     and not exists (select 1 from public.profiles where role = 'admin' and active and id <> old.id) then
    raise exception 'LAST_ADMIN' using hint = 'At least one active administrator must remain.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists profiles_protect_last_admin on public.profiles;
create trigger profiles_protect_last_admin before update or delete on public.profiles
for each row execute function public.protect_last_admin();
