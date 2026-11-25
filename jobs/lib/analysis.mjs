// "Smart" parts of the report: counts, repeat hotspots, written summary, weekly trends.

export function distanceM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function countBy(list, key) {
  const m = new Map();
  for (const x of list) m.set(x[key], (m.get(x[key]) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Repeat hotspots: places where issues keep coming back.
 * focus  = observations of the report period (only these can trigger a hotspot)
 * window = all observations of the look-back window (incl. focus)
 */
export function findHotspots(focus, window, { radius = 25, min = 3, ignore = ['cleanliness_ok'] } = {}) {
  const issues = window.filter((o) => o.lat != null && !ignore.includes(o.category));
  const used = new Set();
  const spots = [];
  for (const o of focus) {
    if (o.lat == null || ignore.includes(o.category) || used.has(o.id)) continue;
    const near = issues.filter((x) => !used.has(x.id) && distanceM(o, x) <= radius);
    if (near.length < min) continue;
    near.forEach((x) => used.add(x.id));
    const days = new Set(near.map((x) => x.created_at.slice(0, 10))).size;
    const areas = countBy(near.filter((x) => x.area), 'area');
    spots.push({
      lat: near.reduce((s, x) => s + x.lat, 0) / near.length,
      lng: near.reduce((s, x) => s + x.lng, 0) / near.length,
      count: near.length, days,
      area: areas[0]?.[0] || '',
      categories: countBy(near, 'category').map(([k]) => k),
      ids: near.map((x) => x.id),
    });
  }
  return spots.sort((a, b) => b.count - a.count);
}

const HIGH = ['high', 'critical'];

export function dailySummary(d, tr) {
  const { today, carried, hotspots, closedToday, supervisors, noInput } = d;
  const lines = [];
  if (noInput) {
    lines.push(tr('noInputSentence'));
  } else {
    lines.push(tr('obsSentence', { n: today.length, s: supervisors.length }));
    const high = today.filter((o) => HIGH.includes(o.severity)).length;
    if (high) lines.push(tr('highSentence', { n: high }));
    const top = countBy(today.filter((o) => o.category !== 'cleanliness_ok'), 'category')[0];
    if (top) lines.push(tr('topSentence', { c: tr.cat(top[0]), n: top[1] }));
    const ok = today.filter((o) => o.category === 'cleanliness_ok').length;
    if (ok) lines.push(tr('okSentence', { n: ok }));
  }
  const openToday = today.filter((o) => o.status === 'open').length;
  lines.push(tr('openSentence', { n: openToday + carried.length, c: carried.length, k: closedToday }));
  if (hotspots.length) lines.push(tr('hotspotSentence', { n: hotspots.length, a: hotspots.map((h) => h.area || '—').slice(0, 3).join(', ') }));
  return lines.join(' ');
}

export function weeklyStats(week, prevWeek, closedInWeek, days) {
  const perDay = days.map((day) => ({ day, n: week.filter((o) => o.localDay === day).length }));
  const hours = closedInWeek.filter((o) => o.closed_at).map((o) => (new Date(o.closed_at) - new Date(o.created_at)) / 3600000);
  hours.sort((a, b) => a - b);
  const median = hours.length ? hours[Math.floor(hours.length / 2)] : null;
  const mean = hours.length ? hours.reduce((s, x) => s + x, 0) / hours.length : null;
  return {
    total: week.length, prevTotal: prevWeek.length,
    perDay,
    byCategory: countBy(week, 'category'),
    bySeverity: countBy(week, 'severity'),
    topAreas: countBy(week.filter((o) => o.area && o.category !== 'cleanliness_ok'), 'area').slice(0, 5),
    bySupervisor: countBy(week, 'supervisor_id'),
    closedCount: closedInWeek.length, medianCloseH: median, meanCloseH: mean,
    high: week.filter((o) => HIGH.includes(o.severity)).length,
  };
}

export function weeklySummary(st, hotspots, openNow, tr) {
  const lines = [];
  const diff = st.prevTotal ? Math.round(((st.total - st.prevTotal) / st.prevTotal) * 100) : null;
  lines.push(tr('wkObs', { n: st.total }) + (diff === null ? '' : ' ' + tr(diff >= 0 ? 'wkUp' : 'wkDown', { p: Math.abs(diff), n: st.prevTotal })) + '.');
  const top = st.byCategory.find(([k]) => k !== 'cleanliness_ok');
  if (top) lines.push(tr('topSentence', { c: tr.cat(top[0]), n: top[1] }));
  if (st.high) lines.push(tr('highSentence', { n: st.high }));
  if (st.medianCloseH !== null) lines.push(tr('wkClose', { n: st.closedCount, h: fmtHours(st.medianCloseH) }));
  lines.push(tr('wkOpen', { n: openNow }));
  if (hotspots.length) lines.push(tr('hotspotSentence', { n: hotspots.length, a: hotspots.map((h) => h.area || '—').slice(0, 3).join(', ') }));
  return lines.join(' ');
}

export const fmtHours = (h) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} j/d`);
