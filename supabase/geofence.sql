-- Run once in Supabase → SQL Editor (adds the site restriction). Safe to run again.
-- ───────────────────────── Site restriction (geofence) ─────────────────────────
-- Each Bloc has a zone radius in metres around its map centre (0 = no restriction).
-- Supervisors can only save an observation from inside the zone, with a GPS fix of ±100 m or better.
-- Administrators are not restricted.
alter table public.blocs add column if not exists geofence_m int not null default 0 check (geofence_m >= 0);

create or replace function public.check_observation_location() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.blocs; d double precision;
begin
  select * into b from public.blocs where id = new.bloc_id;
  if b.geofence_m is null or b.geofence_m = 0 or public.is_admin() then return new; end if;
  if new.lat is null or new.lng is null then
    raise exception 'GPS_REQUIRED' using hint = 'An observation can only be saved on site with GPS.';
  end if;
  if new.gps_accuracy is null or new.gps_accuracy > 100 then
    raise exception 'GPS_IMPRECISE' using hint = 'GPS accuracy must be 100 m or better.';
  end if;
  d := 2 * 6371000 * asin(sqrt(power(sin(radians(new.lat - b.center_lat) / 2), 2)
        + cos(radians(b.center_lat)) * cos(radians(new.lat)) * power(sin(radians(new.lng - b.center_lng) / 2), 2)));
  if d > b.geofence_m then
    raise exception 'OUTSIDE_ZONE:%', round(d - b.geofence_m) using hint = 'The position is outside the Bloc zone.';
  end if;
  return new;
end $$;

drop trigger if exists observations_location on public.observations;
create trigger observations_location before insert on public.observations
for each row execute function public.check_observation_location();
