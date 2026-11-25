-- JPH Housekeeping — database schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  role text not null default 'supervisor' check (role in ('admin','supervisor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.blocs (
  id serial primary key,
  name text unique not null,
  center_lat double precision not null default 33.1050,
  center_lng double precision not null default -8.6370,
  zoom int not null default 16,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bloc_supervisors (
  bloc_id int references public.blocs(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (bloc_id, user_id)
);

create table if not exists public.bloc_recipients (
  id serial primary key,
  bloc_id int not null references public.blocs(id) on delete cascade,
  email text not null,
  name text not null default '',
  daily boolean not null default true,
  weekly boolean not null default true,
  unique (bloc_id, email)
);

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  bloc_id int not null references public.blocs(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  gps_accuracy double precision,
  area text not null default '',
  category text not null,
  severity text not null,
  comment text not null default '',
  status text not null default 'open' check (status in ('open','closed')),
  temp_photo_path text,
  drive_link text,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id),
  closing_comment text not null default '',
  closing_temp_path text,
  closing_photo_link text
);
create index if not exists observations_bloc_created on public.observations (bloc_id, created_at desc);
create index if not exists observations_open on public.observations (bloc_id) where status = 'open';

create table if not exists public.reports (
  id serial primary key,
  bloc_id int references public.blocs(id) on delete cascade,
  type text not null check (type in ('daily','weekly','no_input_alert')),
  period text not null,               -- '2026-11-25' or '2026-W48'
  pdf_link text,
  sent_at timestamptz not null default now(),
  recipients text[] not null default '{}',
  status text not null default 'sent',
  note text not null default '',
  unique (bloc_id, type, period)
);

-- Single-row settings table
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'Africa/Casablanca',
  daily_time text not null default '19:00',
  weekly_day int not null default 1,           -- 1 = Monday … 7 = Sunday
  weekly_time text not null default '08:00',
  no_input_time text not null default '14:00', -- warn if a Bloc has no observation by this time
  alert_emails text[] not null default '{}',   -- who receives "no input" warnings
  sender_name text not null default 'JPH Housekeeping',
  report_language text not null default 'both' check (report_language in ('en','fr','both')),
  hotspot_radius_m int not null default 25,
  hotspot_days int not null default 7,
  hotspot_min int not null default 3,
  categories jsonb not null default '[
    {"key":"spillage","en":"Spillage","fr":"Déversement","ar":"انسكاب"},
    {"key":"waste","en":"Waste","fr":"Déchets","ar":"نفايات"},
    {"key":"obstruction","en":"Obstruction","fr":"Obstruction","ar":"عائق"},
    {"key":"leak","en":"Leak","fr":"Fuite","ar":"تسرّب"},
    {"key":"dust","en":"Dust","fr":"Poussière","ar":"غبار"},
    {"key":"equipment_left","en":"Equipment left","fr":"Matériel abandonné","ar":"معدات متروكة"},
    {"key":"cleanliness_ok","en":"Cleanliness OK","fr":"Propreté OK","ar":"النظافة جيدة"},
    {"key":"other","en":"Other","fr":"Autre","ar":"أخرى"}
  ]'::jsonb,
  severities jsonb not null default '[
    {"key":"low","en":"Low","fr":"Faible","ar":"منخفضة"},
    {"key":"medium","en":"Medium","fr":"Moyenne","ar":"متوسطة"},
    {"key":"high","en":"High","fr":"Élevée","ar":"مرتفعة"},
    {"key":"critical","en":"Critical","fr":"Critique","ar":"حرجة"}
  ]'::jsonb
);
insert into public.settings (id) values (1) on conflict do nothing;

insert into public.blocs (name) values ('Bloc 7'),('Bloc 8'),('Bloc 9'),('Bloc 10')
on conflict (name) do nothing;

-- ───────────────────────── Helpers ─────────────────────────

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.my_bloc_ids() returns setof int
language sql stable security definer set search_path = public as $$
  select bloc_id from bloc_supervisors where user_id = auth.uid()
  union
  select id from blocs where public.is_admin();
$$;

-- Usernames map to internal e-mail addresses (no e-mail is ever sent to them).
create or replace function public.username_email(p_username text) returns text
language sql immutable as $$ select lower(trim(p_username)) || '@jph.local' $$;

-- Create a login. Admin only (or anyone while no admin exists yet = first-time setup).
create or replace function public.admin_create_user(
  p_username text, p_full_name text, p_password text, p_role text default 'supervisor'
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := public.username_email(p_username);
begin
  if not public.is_admin() and exists (select 1 from profiles where role = 'admin') then
    raise exception 'Only an admin can create users';
  end if;
  if p_username !~ '^[a-zA-Z0-9._-]{3,30}$' then
    raise exception 'Username must be 3-30 letters, digits, dot, dash or underscore';
  end if;
  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Username already exists';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', lower(p_username), 'full_name', p_full_name),
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  insert into public.profiles (id, username, full_name, role)
  values (v_id, lower(p_username), p_full_name, case when p_role = 'admin' then 'admin' else 'supervisor' end);
  return v_id;
end $$;

create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_admin() and p_user <> auth.uid() then raise exception 'Not allowed'; end if;
  if length(p_password) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = p_user;
end $$;

create or replace function public.admin_update_user(p_user uuid, p_full_name text, p_role text, p_active boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then
    raise exception 'You cannot remove your own admin access';
  end if;
  update public.profiles set full_name = p_full_name, role = p_role, active = p_active where id = p_user;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end
  where id = p_user;
end $$;

-- ───────────────────────── Row level security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.blocs enable row level security;
alter table public.bloc_supervisors enable row level security;
alter table public.bloc_recipients enable row level security;
alter table public.observations enable row level security;
alter table public.reports enable row level security;
alter table public.settings enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated using (true);

create policy blocs_read on public.blocs for select to authenticated using (true);
create policy blocs_admin on public.blocs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy bs_read on public.bloc_supervisors for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy bs_admin on public.bloc_supervisors for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy br_admin on public.bloc_recipients for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy obs_read on public.observations for select to authenticated
  using (bloc_id in (select public.my_bloc_ids()));
create policy obs_insert on public.observations for insert to authenticated
  with check (supervisor_id = auth.uid() and bloc_id in (select public.my_bloc_ids()));
create policy obs_update on public.observations for update to authenticated
  using (bloc_id in (select public.my_bloc_ids())) with check (bloc_id in (select public.my_bloc_ids()));
create policy obs_delete on public.observations for delete to authenticated using (public.is_admin());

create policy reports_read on public.reports for select to authenticated using (public.is_admin());

create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Storage (temporary photos) ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
drop policy if exists photos_write on storage.objects;
create policy photos_read on storage.objects for select to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1])::int in (select public.my_bloc_ids()));
create policy photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and ((storage.foldername(name))[1])::int in (select public.my_bloc_ids()));

-- Table access for signed-in users (rows are still filtered by the policies above).
-- Needed on newer Supabase projects, where tables created in SQL are not exposed automatically.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- The report engine (GitHub Actions) uses the secret / service_role key.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_bloc_ids() to authenticated;

-- Private branding files (JESA logos/background) for the PDF reports. Admins upload, the report engine reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', false, 5242880, array['image/png','image/jpeg'])
on conflict (id) do nothing;
drop policy if exists branding_admin_read on storage.objects;
drop policy if exists branding_admin_write on storage.objects;
drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_read on storage.objects for select to authenticated using (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_update on storage.objects for update to authenticated using (bucket_id = 'branding' and public.is_admin());

-- Grants for the RPCs
revoke execute on function public.admin_create_user(text,text,text,text) from public, anon;
revoke execute on function public.admin_set_password(uuid,text) from public, anon;
revoke execute on function public.admin_update_user(uuid,text,text,boolean) from public, anon;
grant execute on function public.admin_create_user(text,text,text,text) to authenticated;
grant execute on function public.admin_set_password(uuid,text) to authenticated;
grant execute on function public.admin_update_user(uuid,text,text,boolean) to authenticated;

-- Repair logins created by an earlier version of admin_create_user (missing empty-text fields).
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email like '%@jph.local';

-- Arabic labels for the default categories and severities (keeps any custom ones).
update public.settings set
  categories = (select jsonb_agg(case when c ? 'ar' then c else c || jsonb_build_object('ar', coalesce(m.ar, c->>'fr')) end)
                from jsonb_array_elements(categories) c
                left join (values ('spillage','انسكاب'),('waste','نفايات'),('obstruction','عائق'),('leak','تسرّب'),('dust','غبار'),
                  ('equipment_left','معدات متروكة'),('cleanliness_ok','النظافة جيدة'),('other','أخرى')) m(key, ar) on m.key = c->>'key'),
  severities = (select jsonb_agg(case when c ? 'ar' then c else c || jsonb_build_object('ar', coalesce(m.ar, c->>'fr')) end)
                from jsonb_array_elements(severities) c
                left join (values ('low','منخفضة'),('medium','متوسطة'),('high','مرتفعة'),('critical','حرجة')) m(key, ar) on m.key = c->>'key')
where id = 1;
