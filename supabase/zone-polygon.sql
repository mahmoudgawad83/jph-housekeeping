-- Run once in Supabase → SQL Editor (lets the admin draw each Bloc's zone on the map). Safe to run again.
-- Needs supabase/geofence.sql to have been run first.
-- ───────────────────────── Drawn Bloc zones (polygons) ─────────────────────────
-- blocs.zone = [[lat,lng], ...] drawn by the admin on the map (3+ points). When set it replaces the circle
-- (geofence_m). Observations are accepted inside the outline or within 25 m of it (GPS tolerance).
alter table public.blocs add column if not exists zone jsonb;

-- 0 when the point is inside the polygon, otherwise the distance in metres to its nearest edge.
create or replace function public.zone_distance_m(p_zone jsonb, p_lat double precision, p_lng double precision)
returns double precision language plpgsql immutable as $$
declare
  n int := jsonb_array_length(p_zone); i int; j int; inside boolean := false;
  kx double precision := 111320 * cos(radians(p_lat)); ky double precision := 110540;
  ya double precision; xa double precision; yb double precision; xb double precision;
  sx double precision; sy double precision; ex double precision; ey double precision;
  px double precision := p_lng * kx; py double precision := p_lat * ky;
  t double precision; dx double precision; dy double precision; d double precision; best double precision := 'infinity';
begin
  j := n - 1;
  for i in 0 .. n - 1 loop
    ya := (p_zone->i->>0)::float8; xa := (p_zone->i->>1)::float8;
    yb := (p_zone->j->>0)::float8; xb := (p_zone->j->>1)::float8;
    if ((ya > p_lat) <> (yb > p_lat)) and (p_lng < (xb - xa) * (p_lat - ya) / (yb - ya) + xa) then inside := not inside; end if;
    sx := xa * kx; sy := ya * ky; ex := xb * kx; ey := yb * ky;
    dx := ex - sx; dy := ey - sy;
    t := case when dx = 0 and dy = 0 then 0 else greatest(0, least(1, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy))) end;
    d := sqrt(power(px - (sx + t * dx), 2) + power(py - (sy + t * dy), 2));
    if d < best then best := d; end if;
    j := i;
  end loop;
  return case when inside then 0 else best end;
end $$;

create or replace function public.check_observation_location() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.blocs; d double precision; has_zone boolean;
begin
  select * into b from public.blocs where id = new.bloc_id;
  has_zone := b.zone is not null and jsonb_typeof(b.zone) = 'array' and jsonb_array_length(b.zone) >= 3;
  if (not has_zone and coalesce(b.geofence_m, 0) = 0) or public.is_admin() then return new; end if;
  if new.lat is null or new.lng is null then
    raise exception 'GPS_REQUIRED' using hint = 'An observation can only be saved on site with GPS.';
  end if;
  if new.gps_accuracy is null or new.gps_accuracy > 100 then
    raise exception 'GPS_IMPRECISE' using hint = 'GPS accuracy must be 100 m or better.';
  end if;
  if has_zone then
    d := public.zone_distance_m(b.zone, new.lat, new.lng);
    if d > 25 then raise exception 'OUTSIDE_ZONE:%', round(d) using hint = 'The position is outside the Bloc zone.'; end if;
  else
    d := 2 * 6371000 * asin(sqrt(power(sin(radians(new.lat - b.center_lat) / 2), 2)
          + cos(radians(b.center_lat)) * cos(radians(new.lat)) * power(sin(radians(new.lng - b.center_lng) / 2), 2)));
    if d > b.geofence_m then raise exception 'OUTSIDE_ZONE:%', round(d - b.geofence_m) using hint = 'The position is outside the Bloc zone.'; end if;
  end if;
  return new;
end $$;
