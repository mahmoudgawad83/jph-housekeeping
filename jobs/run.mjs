// Hourly job (GitHub Actions): archive photos to Drive, send "no input" warnings,
// daily + weekly PDF reports, and delete temporary photos older than 30 days.
//
// Usage:  node run.mjs                          normal hourly run
//         node run.mjs --force daily [--date 2026-11-25] [--bloc "Bloc 7"] [--dry-run]
//         node run.mjs --force weekly [--dry-run]
// --dry-run writes PDFs to jobs/out/ and sends / records nothing.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { zonedParts, startOfDay, addDays, toMinutes, fmtLocal, fmtYmd } from './lib/time.mjs';
import { findHotspots, countBy, dailySummary, weeklyStats, weeklySummary } from './lib/analysis.mjs';
import { makeTr } from './lib/text.mjs';
import { buildDailyPdf, buildWeeklyPdf, prepareBrand } from './lib/pdf.mjs';
import { mapSnapshot } from './lib/mapimg.mjs';
import { driveEnabled, folderPath, upload } from './lib/drive.mjs';
import { emailEnabled, sendEmail } from './lib/email.mjs';

const { values: args } = parseArgs({ options: {
  force: { type: 'string' }, date: { type: 'string' }, bloc: { type: 'string' }, 'dry-run': { type: 'boolean', default: false },
} });
const DRY = args['dry-run'];
const BUCKET = 'photos';
const MAX_ATTACH = 9.5 * 1024 * 1024;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ───────── Context ─────────
const settings = must(await sb.from('settings').select('*').eq('id', 1).single());
const TZ = settings.timezone;
const blocs = must(await sb.from('blocs').select('*').eq('active', true).order('id'))
  .filter((b) => !args.bloc || b.name === args.bloc || String(b.id) === args.bloc);
const people = Object.fromEntries(must(await sb.from('profiles').select('id, username, full_name')).map((p) => [p.id, p]));
const person = (id) => people[id]?.full_name || people[id]?.username || '—';
const now = new Date();
const loc = zonedParts(now, TZ);
const today = args.date || loc.ymd;
const nowMin = loc.hh * 60 + loc.mm;
const langs = settings.report_language === 'both' ? ['fr', 'en'] : [settings.report_language];
const tr = makeTr(settings.report_language, settings);
const fmtTime = (iso) => fmtLocal(iso, TZ);
const fmtDateTime = (iso) => fmtLocal(iso, TZ, true);
log(`Local time ${loc.ymd} ${loc.hh}:${String(loc.mm).padStart(2, '0')} (${TZ}); drive=${driveEnabled} email=${emailEnabled} dry=${DRY}`);

async function download(path) {
  if (!path) return null;
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) { log('photo missing', path); return null; }
  return Buffer.from(await data.arrayBuffer());
}
// JESA branding (logos, background) kept in the private "branding" bucket, not in the public repo.
let brandCache = null;
async function loadBrand() {
  if (brandCache) return brandCache;
  const files = { logo: 'jesa-logo.png', logoSmall: 'jesa-logo-small.png', url: 'jesagroup-com.png', bg: 'bg-cover.jpg' };
  brandCache = {};
  for (const [k, f] of Object.entries(files)) {
    const { data, error } = await sb.storage.from('branding').download(f);
    if (!error && data) brandCache[k] = Buffer.from(await data.arrayBuffer());
  }
  brandCache = await prepareBrand(brandCache);
  log(`Branding: ${Object.keys(brandCache).length}/4 file(s) loaded`);
  return brandCache;
}

async function alreadySent(blocId, type, period) {
  // A failed or not-yet-configured send does not count: the next hourly run tries again.
  // A manual test sent before the scheduled time does not count either.
  const { data } = await sb.from('reports').select('id, status, sent_at').eq('bloc_id', blocId).eq('type', type).eq('period', period).maybeSingle();
  if (!data || ['error', 'email_not_configured'].includes(data.status)) return false;
  const due = { daily: settings.daily_time, weekly: settings.weekly_time }[type];
  if (due) { const p = zonedParts(new Date(data.sent_at), TZ); if (p.ymd === today && p.hh * 60 + p.mm < toMinutes(due)) return false; }
  return true;
}
async function record(row) {
  if (DRY) return;
  must(await sb.from('reports').upsert(row, { onConflict: 'bloc_id,type,period' }));
}
const obsQuery = (blocId) => sb.from('observations').select('*').eq('bloc_id', blocId);

// ───────── 1. Archive photos to Google Drive ─────────
async function archive() {
  if (!driveEnabled || DRY) return;
  const pending = must(await sb.from('observations').select('*').not('temp_photo_path', 'is', null).is('drive_link', null).order('created_at').limit(150));
  const closing = must(await sb.from('observations').select('*').not('closing_temp_path', 'is', null).is('closing_photo_link', null).limit(150));
  const blocById = Object.fromEntries(must(await sb.from('blocs').select('id, name')).map((b) => [b.id, b.name]));
  const save = async (o, path, field, suffix) => {
    const buf = await download(path); if (!buf) return;
    const p = zonedParts(new Date(o.created_at), TZ);
    const folder = await folderPath([blocById[o.bloc_id] || `Bloc ${o.bloc_id}`, p.ymd]);
    const safeArea = (o.area || o.category).replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 40).trim();
    const name = `${p.ymd}_${String(p.hh).padStart(2, '0')}${String(p.mm).padStart(2, '0')}_${safeArea}_${o.id.slice(0, 8)}${suffix}.jpg`;
    const desc = `Bloc: ${blocById[o.bloc_id]}\nArea: ${o.area}\nCategory: ${o.category}\nSeverity: ${o.severity}\nGPS: ${o.lat}, ${o.lng}\nBy: ${person(o.supervisor_id)}\nTime: ${o.created_at}\nComment: ${o.comment}`;
    const link = await upload(buf, name, 'image/jpeg', folder, desc);
    must(await sb.from('observations').update({ [field]: link }).eq('id', o.id));
  };
  let n = 0;
  for (const o of pending) { try { await save(o, o.temp_photo_path, 'drive_link', ''); n++; } catch (e) { log('archive failed', o.id, e.message); } }
  for (const o of closing) { try { await save(o, o.closing_temp_path, 'closing_photo_link', '_after'); n++; } catch (e) { log('archive failed', o.id, e.message); } }
  log(`Archived ${n} photo(s) to Drive`);
}

// ───────── 2. Daily report ─────────
async function dailyData(bloc, ymd) {
  const start = startOfDay(ymd, TZ).toISOString(), end = startOfDay(addDays(ymd, 1), TZ).toISOString();
  const winStart = startOfDay(addDays(ymd, -(settings.hotspot_days - 1)), TZ).toISOString();
  const todayObs = must(await obsQuery(bloc.id).gte('created_at', start).lt('created_at', end).order('created_at'));
  const carried = must(await obsQuery(bloc.id).eq('status', 'open').lt('created_at', start).order('created_at'));
  const window = must(await obsQuery(bloc.id).gte('created_at', winStart).lt('created_at', end));
  const { count: closedToday } = await obsQuery(bloc.id).select('id', { count: 'exact', head: true }).gte('closed_at', start).lt('closed_at', end);
  todayObs.forEach((o, i) => (o.n = i + 1));
  carried.forEach((o) => (o.ageDays = Math.floor((new Date(end) - new Date(o.created_at)) / 86400000)));
  const hotspots = findHotspots(todayObs, window, { radius: settings.hotspot_radius_m, min: settings.hotspot_min });
  const d = {
    today: todayObs, carried, hotspots, closedToday: closedToday || 0,
    supervisors: [...new Set(todayObs.map((o) => o.supervisor_id))],
    noInput: todayObs.length === 0,
    byCategory: countBy(todayObs, 'category'), bySeverity: countBy(todayObs, 'severity'),
  };
  d.mapImg = await mapSnapshot(todayObs.map((o) => ({ lat: o.lat, lng: o.lng, label: String(o.n), severity: o.severity, status: o.status })),
    { lat: bloc.center_lat, lng: bloc.center_lng, zoom: bloc.zoom }).catch((e) => { log('map failed', e.message); return null; });
  return d;
}

function emailHtml(title, sub, paragraphs, driveLink, extra = '') {
  const e = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#1E293B;max-width:640px;margin:auto;background:#F8FAFC;padding:24px">
  <div style="background:#fff;border:1px solid #E2E8F0;border-top:4px solid #253C8D;border-radius:12px;padding:24px">
  <h1 style="font-size:20px;margin:0 0 4px;color:#253C8D;font-family:Verdana,Arial,sans-serif">${e(title)}</h1><p style="margin:0 0 16px;color:#475569">${e(sub)}</p>
  ${paragraphs.map((p, i) => `<p style="margin:0 0 10px;line-height:1.5;${i ? 'color:#475569' : ''}">${e(p)}</p>`).join('')}
  ${extra}
  ${driveLink ? `<p style="margin:16px 0 0"><a href="${e(driveLink)}" style="color:#1D4ED8">${e(tr('emailDrive'))}</a></p>` : ''}
  <p style="margin:16px 0 0;color:#475569;font-size:13px">${e(tr('emailIntro'))}</p></div></div>`;
}

async function deliver({ bloc, type, period, subject, title, sub, paragraphs, build, recipients }) {
  let pdf = await build({ px: 900, q: 70 });
  if (pdf.length > MAX_ATTACH) pdf = await build({ px: 600, q: 55 });
  const filename = `${bloc.name.replace(/\s+/g, '_')}_${type}_${period}.pdf`;
  if (DRY) { await fs.mkdir('out', { recursive: true }); await fs.writeFile(`out/${filename}`, pdf); log('wrote', `out/${filename}`, `${(pdf.length / 1024).toFixed(0)} KB`); return; }
  let pdfLink = null;
  if (driveEnabled) {
    try { pdfLink = await upload(pdf, filename, 'application/pdf', await folderPath([bloc.name, 'Reports'])); }
    catch (e) { log('PDF upload failed', e.message); }
  }
  const to = recipients.map((r) => ({ email: r.email, name: r.name }));
  let status = 'sent', note = '';
  if (!to.length) { status = 'no_recipients'; }
  else if (!emailEnabled) { status = 'email_not_configured'; }
  else {
    const attach = pdf.length <= MAX_ATTACH;
    if (!attach) note = tr('pdfTooBig');
    try {
      await sendEmail({ to, subject, senderName: settings.sender_name,
        html: emailHtml(title, sub, attach ? paragraphs : [...paragraphs, note], pdfLink),
        attachments: attach ? [{ filename, content: pdf }] : [] });
    } catch (e) { status = 'error'; note = e.message.slice(0, 500); log('email failed', e.message); }
  }
  await record({ bloc_id: bloc.id, type, period, pdf_link: pdfLink, recipients: to.map((x) => x.email), status, note, sent_at: new Date().toISOString() });
  log(`${type} ${bloc.name} ${period}: ${status} → ${to.length} recipient(s)`);
  if (status === 'error') throw new Error(note);
}

async function sendDaily(bloc, ymd) {
  const d = await dailyData(bloc, ymd);
  const trs = langs.map((l) => { const t = makeTr(l, settings); t.summaryDaily = dailySummary(d, t); return t; });
  const photos = new Map();
  for (const o of [...d.today, ...d.carried]) for (const p of [o.temp_photo_path, o.closing_temp_path]) if (p) photos.set(p, await download(p));
  const ctx = { tr, trs, bloc, settings, photos, person, fmtTime, fmtDateTime, brand: await loadBrand(),
    ymdLabel: fmtYmd(ymd), generatedLabel: `${tr('generated')} ${fmtDateTime(new Date())}` };
  const recipients = must(await sb.from('bloc_recipients').select('*').eq('bloc_id', bloc.id).eq('daily', true));
  await deliver({ bloc, type: 'daily', period: ymd, recipients,
    subject: `${tr.only(langs[0])('daily')} – ${bloc.name} – ${fmtYmd(ymd)}${d.noInput ? ' – ' + tr.only(langs[0])('noInputTitle') : ''}`,
    title: tr('daily'), sub: `${bloc.name} · ${fmtYmd(ymd)}`, paragraphs: trs.map((t) => t.summaryDaily),
    build: (opts) => buildDailyPdf(d, ctx, opts) });
}

// ───────── 3. Weekly report (7 days ending yesterday) ─────────
async function sendWeekly(bloc, ymd) {
  const startY = addDays(ymd, -7), endY = ymd;
  const start = startOfDay(startY, TZ).toISOString(), end = startOfDay(endY, TZ).toISOString();
  const prevStart = startOfDay(addDays(startY, -7), TZ).toISOString();
  const week = must(await obsQuery(bloc.id).gte('created_at', start).lt('created_at', end).order('created_at'));
  const prev = must(await obsQuery(bloc.id).gte('created_at', prevStart).lt('created_at', start));
  const closedInWeek = must(await obsQuery(bloc.id).gte('closed_at', start).lt('closed_at', end));
  const openList = must(await obsQuery(bloc.id).eq('status', 'open').lt('created_at', end).order('created_at'));
  week.forEach((o) => (o.localDay = zonedParts(new Date(o.created_at), TZ).ymd));
  const days = Array.from({ length: 7 }, (_, i) => addDays(startY, i));
  const stats = weeklyStats(week, prev, closedInWeek, days);
  const hotspots = findHotspots(week, week, { radius: settings.hotspot_radius_m, min: settings.hotspot_min });
  const trs = langs.map((l) => { const t = makeTr(l, settings); t.summaryWeekly = weeklySummary(stats, hotspots, openList.length, t); return t; });
  const mapImg = await mapSnapshot(week.map((o) => ({ lat: o.lat, lng: o.lng, label: '', severity: o.severity, status: o.status })),
    { lat: bloc.center_lat, lng: bloc.center_lng, zoom: bloc.zoom }).catch(() => null);
  const period = `${startY}_${addDays(endY, -1)}`;
  const periodLabel = `${fmtYmd(startY)} – ${fmtYmd(addDays(endY, -1))}`;
  const ctx = { tr, trs, bloc, settings, person, fmtDateTime, periodLabel, brand: await loadBrand(), generatedLabel: `${tr('generated')} ${fmtDateTime(new Date())}` };
  const recipients = must(await sb.from('bloc_recipients').select('*').eq('bloc_id', bloc.id).eq('weekly', true));
  await deliver({ bloc, type: 'weekly', period, recipients,
    subject: `${tr.only(langs[0])('weekly')} – ${bloc.name} – ${periodLabel}`,
    title: tr('weekly'), sub: `${bloc.name} · ${periodLabel}`, paragraphs: trs.map((t) => t.summaryWeekly),
    build: () => buildWeeklyPdf({ stats, hotspots, openNow: openList.length, openList: openList.slice(0, 60), mapImg }, ctx) });
}

// ───────── 4. "No input" warning ─────────
async function noInputCheck(bloc) {
  if (await alreadySent(bloc.id, 'no_input_alert', today)) return;
  const { count } = await obsQuery(bloc.id).select('id', { count: 'exact', head: true }).gte('created_at', startOfDay(today, TZ).toISOString());
  if (count) return;
  const to = (settings.alert_emails || []).map((email) => ({ email }));
  const t0 = makeTr(langs[0], settings);
  let status = 'sent', note = '';
  if (!to.length) status = 'no_recipients';
  else if (!emailEnabled) status = 'email_not_configured';
  else if (!DRY) {
    const time = `${String(loc.hh).padStart(2, '0')}:${String(loc.mm).padStart(2, '0')}`;
    try {
      await sendEmail({ to, senderName: settings.sender_name, subject: t0('alertSubject', { b: bloc.name, d: fmtYmd(today) }),
        html: emailHtml(tr('noInputTitle'), bloc.name, langs.map((l) => makeTr(l, settings)('alertBody', { b: bloc.name, d: fmtYmd(today), t: time })), null) });
    } catch (e) { status = 'error'; note = e.message.slice(0, 500); }
  }
  await record({ bloc_id: bloc.id, type: 'no_input_alert', period: today, recipients: to.map((x) => x.email), status, note });
  log(`no-input alert ${bloc.name}: ${status}`);
}

// ───────── 5. Clean-up of temporary photos (30 days) ─────────
async function cleanup() {
  if (DRY) return;
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const old = must(await sb.from('observations').select('id, temp_photo_path, drive_link, closing_temp_path, closing_photo_link, created_at, closed_at')
    .lt('created_at', cutoff).or('temp_photo_path.not.is.null,closing_temp_path.not.is.null').limit(500));
  let removed = 0, kept = 0;
  for (const o of old) {
    const paths = [], patch = {};
    if (o.temp_photo_path) { if (o.drive_link || !driveEnabled) { paths.push(o.temp_photo_path); patch.temp_photo_path = null; } else kept++; }
    if (o.closing_temp_path && (!o.closed_at || o.closed_at < cutoff)) {
      if (o.closing_photo_link || !driveEnabled) { paths.push(o.closing_temp_path); patch.closing_temp_path = null; } else kept++;
    }
    if (!paths.length) continue;
    const { error } = await sb.storage.from(BUCKET).remove(paths);
    if (error) { log('remove failed', o.id, error.message); continue; }
    must(await sb.from('observations').update(patch).eq('id', o.id));
    removed += paths.length;
  }
  log(`Clean-up: removed ${removed} temporary photo(s)${kept ? `, kept ${kept} not yet archived` : ''}`);
}

// ───────── Main ─────────
const errors = [];
const attempt = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); log('ERROR', label, e.stack || e.message); } };

if (args.force) await attempt('archive', archive); // a manual run also archives photos, so links are in the report

if (args.force === 'daily') {
  for (const b of blocs) await attempt(`daily ${b.name}`, () => sendDaily(b, today));
} else if (args.force === 'weekly') {
  for (const b of blocs) await attempt(`weekly ${b.name}`, () => sendWeekly(b, today));
} else {
  await attempt('archive', archive);
  const dailyMin = toMinutes(settings.daily_time), weeklyMin = toMinutes(settings.weekly_time), warnMin = toMinutes(settings.no_input_time);
  for (const b of blocs) {
    if (nowMin >= warnMin && nowMin < dailyMin) await attempt(`no-input ${b.name}`, () => noInputCheck(b));
    if (nowMin >= dailyMin && !(await alreadySent(b.id, 'daily', today))) await attempt(`daily ${b.name}`, () => sendDaily(b, today));
    if (loc.weekday === settings.weekly_day && nowMin >= weeklyMin) {
      const period = `${addDays(today, -7)}_${addDays(today, -1)}`;
      if (!(await alreadySent(b.id, 'weekly', period))) await attempt(`weekly ${b.name}`, () => sendWeekly(b, today));
    }
  }
  await attempt('cleanup', cleanup);
}
if (errors.length) { console.error('Finished with errors:\n' + errors.join('\n')); process.exit(1); }
log('Done');
