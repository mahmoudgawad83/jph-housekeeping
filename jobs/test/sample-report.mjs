// Builds sample daily + weekly PDFs from fake data (no database needed): node test/sample-report.mjs
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { buildDailyPdf, buildWeeklyPdf } from '../lib/pdf.mjs';
import { findHotspots, countBy, dailySummary, weeklyStats, weeklySummary } from '../lib/analysis.mjs';
import { makeTr } from '../lib/text.mjs';
import { mapSnapshot } from '../lib/mapimg.mjs';
import { addDays } from '../lib/time.mjs';

const settings = {
  report_language: 'both', hotspot_radius_m: 25, hotspot_min: 3,
  categories: [{ key: 'spillage', en: 'Spillage', fr: 'Déversement' }, { key: 'waste', en: 'Waste', fr: 'Déchets' },
    { key: 'obstruction', en: 'Obstruction', fr: 'Obstruction' }, { key: 'cleanliness_ok', en: 'Cleanliness OK', fr: 'Propreté OK' }],
  severities: [{ key: 'low', en: 'Low', fr: 'Faible' }, { key: 'medium', en: 'Medium', fr: 'Moyenne' }, { key: 'high', en: 'High', fr: 'Élevée' }, { key: 'critical', en: 'Critical', fr: 'Critique' }],
};
const bloc = { id: 7, name: 'Bloc 7', center_lat: 33.1050, center_lng: -8.6370, zoom: 16 };
const cats = ['spillage', 'waste', 'obstruction', 'cleanliness_ok'], sevs = ['low', 'medium', 'high', 'critical'];
const areas = ['Convoyeur C3', 'Porte 2', 'Hangar stockage', 'Station pompage'];
const mk = (i, dayOffset, extra = {}) => ({
  id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, bloc_id: 7, supervisor_id: i % 2 ? 'a' : 'b',
  created_at: new Date(Date.UTC(2026, 10, 25 + dayOffset, 8 + (i % 9), i * 7 % 60)).toISOString(),
  lat: 33.1050 + ((i * 37) % 11 - 5) * 0.0004, lng: -8.6370 + ((i * 53) % 13 - 6) * 0.0004, gps_accuracy: 6,
  area: areas[i % 4], category: cats[i % 4], severity: sevs[i % 4], comment: i % 3 ? 'Déversement de phosphate près du convoyeur, à nettoyer.' : '',
  status: i % 5 === 0 ? 'closed' : 'open', temp_photo_path: `p${i}`, closed_at: null, ...extra,
});
const today = Array.from({ length: 7 }, (_, i) => mk(i + 1, 0));
today.push(mk(20, 0, { lat: 33.1050, lng: -8.6370, category: 'spillage', area: 'Convoyeur C3' }));
const history = [mk(21, -1, { lat: 33.10502, lng: -8.63702, category: 'spillage', area: 'Convoyeur C3' }), mk(22, -3, { lat: 33.10498, lng: -8.63698, category: 'spillage', area: 'Convoyeur C3' })];
const carried = [mk(30, -4, { ageDays: 4 }), mk(31, -2, { ageDays: 2 })];
today.forEach((o, i) => (o.n = i + 1));

const photos = new Map();
for (const o of [...today, ...carried]) {
  const hue = (Number(o.id.slice(-3)) * 47) % 360;
  photos.set(o.temp_photo_path, await sharp({ create: { width: 1600, height: 1200, channels: 3, background: `hsl(${hue},40%,70%)` } }).jpeg().toBuffer());
}
const hotspots = findHotspots(today, [...today, ...history], { radius: 25, min: 3 });
const d = { today, carried, hotspots, closedToday: 1, supervisors: ['a', 'b'], noInput: false,
  byCategory: countBy(today, 'category'), bySeverity: countBy(today, 'severity') };
d.mapImg = await mapSnapshot(today.map((o) => ({ lat: o.lat, lng: o.lng, label: String(o.n), severity: o.severity, status: o.status })), bloc).catch((e) => { console.log('map failed', e.message); return null; });
console.log('map image:', d.mapImg ? `${d.mapImg.length} bytes` : 'none');
const tr = makeTr('both', settings);
const trs = ['fr', 'en'].map((l) => { const t = makeTr(l, settings); t.summaryDaily = dailySummary(d, t); return t; });
const people = { a: 'Youssef A.', b: 'Fatima B.' };
const ctx = { tr, trs, bloc, settings, photos, person: (id) => people[id], fmtTime: (x) => x.slice(11, 16), fmtDateTime: (x) => x.slice(0, 16).replace('T', ' '),
  ymdLabel: '25/11/2026', generatedLabel: 'Généré le 25/11/2026 19:00' };
await fs.mkdir('out', { recursive: true });
const pdf = await buildDailyPdf(d, ctx);
await fs.writeFile('out/sample-daily.pdf', pdf);
console.log('daily', pdf.length, 'bytes; summary:', trs.map((t) => t.summaryDaily));

const week = [...today, ...history, ...carried];
const days = Array.from({ length: 7 }, (_, i) => addDays('2026-11-19', i));
week.forEach((o) => (o.localDay = o.created_at.slice(0, 10)));
const closedInWeek = [{ ...today[4], closed_at: new Date(Date.parse(today[4].created_at) + 5 * 3600000).toISOString() }];
const stats = weeklyStats(week, today.slice(0, 5), closedInWeek, days);
const wtrs = ['fr', 'en'].map((l) => { const t = makeTr(l, settings); t.summaryWeekly = weeklySummary(stats, hotspots, 6, t); return t; });
const wpdf = await buildWeeklyPdf({ stats, hotspots, openNow: 6, openList: carried, mapImg: d.mapImg },
  { ...ctx, trs: wtrs, periodLabel: '18/11/2026 – 24/11/2026' });
await fs.writeFile('out/sample-weekly.pdf', wpdf);
console.log('weekly', wpdf.length, 'bytes');
