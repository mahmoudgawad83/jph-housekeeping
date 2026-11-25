// Time-zone helpers (Africa/Casablanca switches between UTC+1 and UTC+0 around Ramadan,
// so never hard-code the offset).

export function zonedParts(date, tz) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second, weekday: wd,
    ymd: `${p.year}-${p.month}-${p.day}` };
}

function offsetMs(date, tz) {
  const p = zonedParts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant of local midnight at the start of `ymd` in `tz`. */
export function startOfDay(ymd, tz) {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(new Date(guess), tz);
  const off2 = offsetMs(new Date(t), tz);
  t = guess - off2;
  return new Date(t);
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function isoWeek(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

export const toMinutes = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };

export function fmtLocal(date, tz, withDate = false) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', ...(withDate ? { day: '2-digit', month: '2-digit', year: 'numeric' } : {}),
  }).format(new Date(date));
}
export const fmtYmd = (ymd) => ymd.split('-').reverse().join('/');
