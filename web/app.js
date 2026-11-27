import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { t, label, getLang, setLang, LANGS, applyDir, locale } from './i18n.js';

const LANG_NAMES = { fr: 'Français', en: 'English', ar: 'العربية' };

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const $app = document.getElementById('app');
const BUCKET = 'photos';
const SEV_LETTER = { low: 'L', medium: 'M', high: 'H', critical: 'C' };
const SEV_LETTER_FR = { low: 'F', medium: 'M', high: 'É', critical: 'C' };

const state = {
  session: null, profile: null, settings: null,
  blocs: [], myBlocIds: [], blocId: null, people: {},
  filter: 'today', map: null, extraMaps: [],
};

// ───────── Icons (Lucide, MIT) ─────────
const ICONS = {
  // Custom two-tone line icons (24px grid, 1.8 stroke): an outline plus a soft "tone" fill.
  camera: '<rect class="tone" x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7 10 4.5h4L15.5 7H18a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"/><circle cx="12" cy="13" r="3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle class="tone" cx="12" cy="12" r="9"/><circle cx="7.5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="16.5" cy="12" r="1.1"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  pin: '<path class="tone" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  map: '<path class="tone" d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  list: '<rect class="tone" x="4.5" y="4" width="15" height="17" rx="3"/><rect x="4.5" y="4" width="15" height="17" rx="3"/><path d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/>',
  shield: '<path class="tone" d="M12 3 5 6v5.5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6z"/><path d="M12 3 5 6v5.5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  logout: '<path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
  lang: '<circle class="tone" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  undo: '<path d="M9 7 5 11l4 4"/><path d="M5 11h9.5a4.5 4.5 0 0 1 0 9H11"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h3"/>',
  trash: '<path class="tone" d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M4 7h16M9 7V4.5h6V7M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"/>',
  spark: '<path class="tone" d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  locate: '<circle class="tone" cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  users: '<circle class="tone" cx="9" cy="8" r="3.5"/><circle cx="9" cy="8" r="3.5"/><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.6.8 2.7 2.6 3 5.2"/>',
  mail: '<rect class="tone" x="3" y="5" width="18" height="14" rx="3"/><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7.5 8 5.5 8-5.5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle class="tone" cx="15" cy="7" r="2.3"/><circle cx="15" cy="7" r="2.3"/><circle class="tone" cx="9" cy="17" r="2.3"/><circle cx="9" cy="17" r="2.3"/>',
  file: '<path class="tone" d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path class="tone" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2z"/><path d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2"/>',
  layers: '<path class="tone" d="m12 3 9 5-9 5-9-5z"/><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5"/>',
  image: '<rect class="tone" x="3" y="4" width="18" height="16" rx="3"/><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 9"/>',
  chart: '<rect class="tone" x="3" y="3" width="18" height="18" rx="4"/><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 16v-3.5M12 16V8M16 16v-5.5"/>',
  // Category icons
  cat_spillage: '<ellipse class="tone" cx="12" cy="18.5" rx="8" ry="2.5"/><ellipse cx="12" cy="18.5" rx="8" ry="2.5"/><path d="M12 3.5s-4 4.6-4 7.6a4 4 0 0 0 8 0c0-3-4-7.6-4-7.6z"/>',
  cat_waste: '<path class="tone" d="M6.5 8h11l-1 11.5a1.8 1.8 0 0 1-1.8 1.5H9.3a1.8 1.8 0 0 1-1.8-1.5z"/><path d="M6.5 8h11l-1 11.5a1.8 1.8 0 0 1-1.8 1.5H9.3a1.8 1.8 0 0 1-1.8-1.5zM4.5 8h15M9.5 8V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V8M10.5 12v5M13.5 12v5"/>',
  cat_obstruction: '<rect class="tone" x="3" y="7" width="18" height="6" rx="1.5"/><rect x="3" y="7" width="18" height="6" rx="1.5"/><path d="M8 7l-4 6M14 7l-5 6M20 7l-5 6M6.5 13v7M17.5 13v7M4.5 20h4M15.5 20h4"/>',
  cat_leak: '<path class="tone" d="M3 5h9a4 4 0 0 1 4 4v1h-4V9H3z"/><path d="M3 5h9a4 4 0 0 1 4 4v1h-4V9H3M11 10h6"/><path d="M14 14s-2.3 2.6-2.3 4.3a2.3 2.3 0 0 0 4.6 0C16.3 16.6 14 14 14 14z"/>',
  cat_dust: '<circle class="tone" cx="17" cy="7" r="3"/><path d="M3 9h10.5a2.5 2.5 0 1 0-2.5-2.5M3 13h14.5a2.5 2.5 0 1 1-2.5 2.5M3 17h7"/><circle cx="19" cy="19.5" r=".7"/><circle cx="14" cy="20.5" r=".7"/>',
  cat_equipment_left: '<rect class="tone" x="3" y="8" width="18" height="12" rx="2.5"/><rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M9 8V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V8M3 13h18M10 13v2h4v-2"/>',
  cat_cleanliness_ok: '<circle class="tone" cx="12" cy="13" r="8"/><circle cx="12" cy="13" r="8"/><path d="m8.5 13 2.4 2.4 4.6-4.8"/><path d="M19.5 2.5v3M18 4h3"/>',
  cat_other: '<circle class="tone" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
};
const catIcon = (k) => (ICONS['cat_' + k] ? 'cat_' + k : 'cat_other');
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const spinner = '<span class="spinner" aria-hidden="true"></span>';

// ───────── Utilities ─────────
function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), isErr ? 6000 : 3000);
}
function fail(e) { console.error(e); const m = String(e?.message || e); toast(m.includes('LAST_ADMIN') ? t('lastAdmin') : t('error', { m }), true); }
async function busy(btn, fn) {
  const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = spinner + ' ' + esc(t('saving'));
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString(locale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const findItem = (list, key) => (list || []).find((x) => x.key === key) || { key, en: key, fr: key };
const catLabel = (k) => label(findItem(state.settings?.categories, k));
const sevLabel = (k) => label(findItem(state.settings?.severities, k));
const sevLetter = (k) => (getLang() === 'fr' ? SEV_LETTER_FR : SEV_LETTER)[k] || '?';
const person = (id) => state.people[id]?.full_name || state.people[id]?.username || '—';
const usernameEmail = (u) => `${u.trim().toLowerCase()}@jph.local`;
const blocName = (id) => state.blocs.find((b) => b.id === id)?.name || '';

function distanceM(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const ZONE_TOLERANCE_M = 25; // same margin as the database rule
// A Bloc's zone: a drawn outline (3+ points) if any, else a circle around the centre, else none.
function zoneOf(bloc) {
  if (!bloc) return null;
  if (Array.isArray(bloc.zone) && bloc.zone.length >= 3) return { poly: bloc.zone };
  return bloc.geofence_m > 0 ? { lat: bloc.center_lat, lng: bloc.center_lng, r: bloc.geofence_m } : null;
}
// Metres outside the zone (0 = inside).
function outsideBy(z, p) {
  if (!z) return 0;
  if (!z.poly) return Math.max(0, distanceM(p, z) - z.r);
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180), ky = 110540, px = p.lng * kx, py = p.lat * ky;
  let inside = false, best = Infinity;
  for (let i = 0, j = z.poly.length - 1; i < z.poly.length; j = i++) {
    const [ya, xa] = z.poly[i], [yb, xb] = z.poly[j];
    if ((ya > p.lat) !== (yb > p.lat) && p.lng < ((xb - xa) * (p.lat - ya)) / (yb - ya) + xa) inside = !inside;
    const ax = xa * kx, ay = ya * ky, dx = xb * kx - ax, dy = yb * ky - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
  }
  if (inside) return 0;
  return best > ZONE_TOLERANCE_M ? best : 0;
}
const ZONE_STYLE = { color: '#047857', weight: 2, dashArray: '6 6', fillColor: '#047857', fillOpacity: 0.06, interactive: false };
function drawZone(map, bloc) {
  const z = zoneOf(bloc); if (!z) return null;
  return (z.poly ? L.polygon(z.poly, ZONE_STYLE) : L.circle([z.lat, z.lng], { radius: z.r, ...ZONE_STYLE })).addTo(map);
}
// Server refusals from the geofence rule → readable messages.
function zoneError(e) {
  const m = String(e?.message || '');
  if (m.startsWith('OUTSIDE_ZONE')) return t('outsideZone', { d: m.split(':')[1] || '?', b: blocName(state.blocId) });
  if (m.startsWith('GPS_REQUIRED')) return t('gpsRequired');
  if (m.startsWith('GPS_IMPRECISE')) return t('gpsImprecise', { a: '>100' });
  return null;
}

function destroyMaps() {
  if (state.map) { state.map.remove(); state.map = null; }
  state.extraMaps.forEach((m) => m.remove()); state.extraMaps = [];
}
function baseLayers(map) {
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagery © Esri',
  });
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20, maxNativeZoom: 19, attribution: '© OpenStreetMap',
  });
  sat.addTo(map);
  L.control.layers({ Satellite: sat, Plan: street }, null, { position: 'bottomleft' }).addTo(map);
}
function pinIcon(o, draft = false) {
  const cls = draft ? 'draft' : o.status === 'closed' ? 'closed' : o.severity;
  const letter = draft ? '+' : o.status === 'closed' ? '✓' : sevLetter(o.severity);
  return L.divIcon({ className: '', html: `<div class="pin ${cls}"><span>${letter}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
}
async function compressImage(file, max = 1600, quality = 0.8) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  const src = bmp || await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const w = src.width, h = src.height, s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
}
async function signedUrls(paths) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return {};
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(list, 3600);
  if (error) return {};
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

// ───────── Session & context ─────────
async function loadContext() {
  const uid = state.session.user.id;
  const [profileRes, settingsRes, blocsRes, mineRes, peopleRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).single(),
    sb.from('settings').select('*').eq('id', 1).single(),
    sb.from('blocs').select('*').order('id'),
    sb.from('bloc_supervisors').select('bloc_id').eq('user_id', uid),
    sb.from('profiles').select('id, username, full_name, role, active'),
  ]);
  const profile = profileRes.data, settings = settingsRes.data, blocs = blocsRes.data, mine = mineRes.data, people = peopleRes.data;
  const firstErr = [profileRes, settingsRes, blocsRes, mineRes, peopleRes].find((r) => r.error)?.error;
  if (firstErr) throw new Error(`${firstErr.message}${firstErr.code ? ` (${firstErr.code})` : ''}`);
  if (!profile) throw new Error('No profile found for this login. Re-create the user with admin_create_user.');
  if (!profile.active) throw new Error('This account is disabled.');
  state.profile = profile;
  state.settings = settings;
  state.blocs = blocs || [];
  state.people = Object.fromEntries((people || []).map((p) => [p.id, p]));
  state.myBlocIds = profile.role === 'admin'
    ? state.blocs.filter((b) => b.active).map((b) => b.id)
    : (mine || []).map((m) => m.bloc_id).filter((id) => state.blocs.find((b) => b.id === id && b.active));
  let saved = null; try { saved = Number(localStorage.getItem('bloc')); } catch { /* ignore */ }
  state.blocId = state.myBlocIds.includes(saved) ? saved : state.myBlocIds[0] ?? null;
}
const isAdmin = () => state.profile?.role === 'admin';

// ───────── Router ─────────
async function route() {
  destroyMaps();
  const h = location.hash || '#/';
  if (!state.session) return renderLogin();
  if (!state.profile) {
    try { await loadContext(); }
    catch (e) {
      console.error(e);
      state.loginError = t('error', { m: e.message });
      state.session = null; state.profile = null;
      await sb.auth.signOut().catch(() => {});
      return renderLogin();
    }
  }
  if (h.startsWith('#/new')) return renderNew();
  if (h.startsWith('#/open')) { state.filter = 'open'; return renderMap(); }
  if (h.startsWith('#/stats')) return renderStats();
  if (h.startsWith('#/obs/')) return renderDetail(h.slice(6));
  if (h.startsWith('#/admin') && isAdmin()) return renderAdmin(h.split('/')[2] || 'blocs');
  return renderMap();
}
window.addEventListener('hashchange', () => route().catch(fail));

// Bottom navigation bar: one tap to the main places (icons + labels, never icons alone).
function bottomNav(active) {
  const items = [
    ['map', '#/', 'map', t('map')],
    ['stats', '#/stats', 'chart', t('stats')],
    ['new', '#/new', 'camera', t('newShort')],
    ...(isAdmin() ? [['admin', '#/admin', 'shield', t('admin')]] : []),
  ];
  return `<nav class="bottom-nav" aria-label="${esc(t('menu'))}">${items.map(([k, href, ic, lbl]) =>
    `<a href="${href}" class="nav-item${k === 'new' ? ' nav-new' : ''}"${k === active ? ' aria-current="page"' : ''} data-nav="${k}"><span class="nav-ic">${icon(ic)}</span><span class="nav-lbl">${esc(lbl)}</span></a>`).join('')}
    <button type="button" class="nav-item" data-nav="menu" aria-haspopup="true"><span class="nav-ic">${icon('more')}</span><span class="nav-lbl">${esc(t('menu'))}</span></button></nav>`;
}
function bindBottomNav() {
  const nav = document.querySelector('.bottom-nav'); if (!nav) return;
  nav.querySelector('[data-nav=map]').onclick = (e) => { if (location.hash === '#/' || location.hash === '') { e.preventDefault(); } state.filter = 'today'; if (location.hash === '#/' || location.hash === '') renderMap(); };
  nav.querySelector('[data-nav=menu]').onclick = (e) => { e.stopPropagation(); document.getElementById('menuBtn')?.click(); };
}

function topbar({ backTo, title } = {}) {
  const blocSelect = !backTo && state.myBlocIds.length
    ? `<label class="sr" for="blocSel">${esc(t('selectBloc'))}</label>
       <select id="blocSel" class="input">${state.myBlocIds.map((id) => `<option value="${id}" ${id === state.blocId ? 'selected' : ''}>${esc(blocName(id))}</option>`).join('')}</select>`
    : '';
  return `<header class="topbar">
    ${backTo ? `<a class="btn ghost icon-btn" href="${backTo}" aria-label="${esc(t('back'))}">${icon('back')}</a><h1 class="grow" style="font-size:18px">${esc(title || '')}</h1>`
             : `<div class="brand grow"><img class="brand-logo" src="brand/jesa-logo.png" alt="JESA" width="379" height="88"><span class="brand-sep" aria-hidden="true"></span><span class="brand-name">${esc(t('appName'))}</span></div>`}
    ${blocSelect}
    <div style="position:relative">
      <button class="btn ghost icon-btn" id="menuBtn" aria-haspopup="true" aria-expanded="false" aria-label="Menu">${icon('more')}</button>
      <div class="menu" id="menu" hidden>
        <div class="small muted" style="padding:8px 12px">${esc(state.profile.full_name || state.profile.username)}</div>
        <div class="lang-row" role="group" aria-label="Language">${LANGS.map((l) => `<button class="btn ghost" data-lang="${l}" lang="${l}" aria-pressed="${l === getLang()}">${LANG_NAMES[l]}</button>`).join('')}</div>
        <a class="btn ghost block" href="#/" style="justify-content:flex-start;text-decoration:none">${icon('pin')}${esc(t('map'))}</a>
        ${isAdmin() ? `<a class="btn ghost block" href="#/admin" style="justify-content:flex-start;text-decoration:none">${icon('shield')}${esc(t('admin'))}</a>` : ''}
        <button class="btn ghost block" data-act="logout">${icon('logout')}${esc(t('signOut'))}</button>
      </div>
    </div>
  </header>${navigator.onLine ? '' : `<div class="banner" role="status">${esc(t('offline'))}</div>`}`;
}
function bindTopbar() {
  const btn = document.getElementById('menuBtn'), menu = document.getElementById('menu');
  btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
  document.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }, { once: true });
  menu.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => { setLang(b.dataset.lang); route(); }));
  menu.querySelector('[data-act=logout]').onclick = async () => { await sb.auth.signOut(); };
  const sel = document.getElementById('blocSel');
  if (sel) sel.onchange = () => { state.blocId = Number(sel.value); try { localStorage.setItem('bloc', sel.value); } catch { /* ignore */ } renderMap(); };
}

// ───────── Login ─────────
function renderLogin() {
  $app.innerHTML = `<main id="main" class="login"><form class="card stack" id="loginForm" novalidate>
    <div class="login-brand"><img src="brand/jesa-logo.png" alt="JESA" width="379" height="88"><h1>${esc(t('appName'))}</h1><p class="small muted">JPH – Jorf Phosphate Hub</p></div>
    <p class="muted small">${esc(t('signInHelp'))}</p>
    <label class="field"><span class="lbl">${esc(t('username'))}</span>
      <input class="input" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
    <label class="field"><span class="lbl">${esc(t('password'))}</span>
      <input class="input" name="password" type="password" autocomplete="current-password" required></label>
    <p class="err small" id="loginErr" role="alert" style="color:var(--danger)"></p>
    <button class="btn primary block" type="submit">${esc(t('signIn'))}</button>
    <div class="lang-row" role="group" aria-label="Language">${LANGS.map((l) => `<button class="btn ghost" type="button" data-lang="${l}" lang="${l}" aria-pressed="${l === getLang()}">${LANG_NAMES[l]}</button>`).join('')}</div>
  </form></main>`;
  $app.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => { setLang(b.dataset.lang); renderLogin(); }));
  if (state.loginError) document.getElementById('loginErr').textContent = state.loginError;
  const form = document.getElementById('loginForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form), btn = form.querySelector('[type=submit]');
    const err = document.getElementById('loginErr'); err.textContent = ''; state.loginError = '';
    await busy(btn, async () => {
      const { data, error } = await sb.auth.signInWithPassword({ email: usernameEmail(fd.get('username')), password: fd.get('password') });
      if (error) {
        err.textContent = /invalid login credentials/i.test(error.message) ? t('badLogin') : t('error', { m: error.message });
        return;
      }
      state.session = data.session; state.profile = null;
      if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
      await route();
    });
  };
}

// ───────── Map + list ─────────
async function fetchObservations(blocId, filter) {
  let q = sb.from('observations').select('*').eq('bloc_id', blocId).order('created_at', { ascending: false }).limit(300);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (filter === 'today') q = q.gte('created_at', start.toISOString());
  if (filter === 'open') q = q.eq('status', 'open');
  if (filter === 'last7') { start.setDate(start.getDate() - 6); q = q.gte('created_at', start.toISOString()); }
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
async function renderMap() {
  destroyMaps();
  if (!state.blocId) {
    $app.innerHTML = topbar() + `<main id="main" class="page"><div class="card empty">${esc(t('noBlocs'))}</div></main>`;
    return bindTopbar();
  }
  const bloc = state.blocs.find((b) => b.id === state.blocId);
  const filters = [['today', t('today')], ['open', t('open')], ['last7', t('last7')]];
  $app.innerHTML = topbar() + `<main id="main" class="map-layout">
    <div class="map-wrap"><div id="map" dir="ltr" role="region" aria-label="${esc(t('map'))}"></div>
      <div class="map-overlay"><div class="seg" role="group">${filters.map(([k, l]) => `<button data-f="${k}" aria-pressed="${state.filter === k}">${esc(l)}</button>`).join('')}</div></div>
    </div>
    <section class="list" id="list" aria-busy="true"><p class="muted">…</p></section>
  </main>
  ${bottomNav('map')}`;
  bindTopbar(); bindBottomNav();
  $app.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { state.filter = b.dataset.f; renderMap(); }));

  const map = (state.map = L.map('map', { zoomControl: false }).setView([bloc.center_lat, bloc.center_lng], bloc.zoom));
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  baseLayers(map);
  drawZone(map, bloc);
  let obs = [];
  try { obs = await fetchObservations(state.blocId, state.filter); } catch (e) { fail(e); }
  if (state.map !== map) return; // navigated away meanwhile
  const pts = [];
  obs.forEach((o) => {
    if (o.lat == null) return;
    pts.push([o.lat, o.lng]);
    L.marker([o.lat, o.lng], { icon: pinIcon(o), title: `${catLabel(o.category)} – ${sevLabel(o.severity)}`, alt: `${catLabel(o.category)} – ${sevLabel(o.severity)}` })
      .addTo(map).on('click', () => (location.hash = `#/obs/${o.id}`));
  });
  if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 18 });

  const urls = await signedUrls(obs.map((o) => o.temp_photo_path));
  const list = document.getElementById('list'); if (!list) return;
  list.setAttribute('aria-busy', 'false');
  list.innerHTML = `<div class="list-head"><h2>${esc(bloc.name)}</h2><span class="muted small">${esc(t('pins', { n: obs.length }))}</span></div>` +
    (obs.length ? obs.map((o) => obsCard(o, urls[o.temp_photo_path])).join('') : `<div class="empty">${icon('pin')}<p>${esc(t('noObs'))}</p></div>`);
}
function obsCard(o, url) {
  return `<a class="obs" href="#/obs/${o.id}" style="text-decoration:none;color:inherit">
    ${url ? `<img src="${esc(url)}" alt="" loading="lazy" width="72" height="72">` : `<span class="ph" style="display:grid;place-items:center;color:var(--text-2)">${icon('image')}</span>`}
    <span class="grow">
      <span class="t">${esc(o.area || catLabel(o.category))}</span>
      <span class="meta" style="display:block">${esc(fmtDateTime(o.created_at))} · ${esc(person(o.supervisor_id))}</span>
      <span class="badges">${catBadge(o.category)}${sevBadge(o.severity)}${statusBadge(o.status)}</span>
    </span></a>`;
}
const catBadge = (c) => `<span class="badge cat">${icon(catIcon(c))}${esc(catLabel(c))}</span>`;
const sevBadge = (s) => `<span class="badge sev-${esc(s)}">${esc(sevLetter(s))} · ${esc(sevLabel(s))}</span>`;
const statusBadge = (s) => `<span class="badge st-${esc(s)}">${esc(s === 'closed' ? t('statusClosed') : t('statusOpen'))}</span>`;

// ───────── Statistics (only Blocs the user may see; the database enforces it too) ─────────
async function renderStats() {
  if (!state.myBlocIds.length) {
    $app.innerHTML = topbar() + `<main id="main" class="page"><div class="card empty">${esc(t('noBlocs'))}</div></main>${bottomNav('stats')}`;
    bindTopbar(); bindBottomNav(); return;
  }
  state.statsBloc = state.statsBloc ?? (state.myBlocIds.length > 1 ? 'all' : String(state.myBlocIds[0]));
  state.statsPeriod = state.statsPeriod || '7';
  const periods = [['1', t('today')], ['7', t('period7')], ['30', t('period30')]];
  $app.innerHTML = topbar({ backTo: '#/', title: t('stats') }) + `<main id="main" class="page stack">
    <div class="stats-filters">
      <label class="sr" for="stBloc">${esc(t('bloc'))}</label>
      <select id="stBloc" class="input">${state.myBlocIds.length > 1 ? `<option value="all">${esc(t('allMyBlocs'))}</option>` : ''}
        ${state.myBlocIds.map((id) => `<option value="${id}">${esc(blocName(id))}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="${esc(t('period'))}">${periods.map(([k, l]) => `<button data-p="${k}" aria-pressed="${state.statsPeriod === k}">${esc(l)}</button>`).join('')}</div>
    </div>
    <div id="stBody" aria-busy="true"><p class="muted">…</p></div>
  </main>${bottomNav('stats')}`;
  bindTopbar(); bindBottomNav();
  const sel = document.getElementById('stBloc'); sel.value = state.statsBloc;
  sel.onchange = () => { state.statsBloc = sel.value; renderStats(); };
  $app.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { state.statsPeriod = b.dataset.p; renderStats(); }));
  try { await fillStats(); } catch (e) { fail(e); }
}

async function fillStats() {
  const ids = state.statsBloc === 'all' ? state.myBlocIds : [Number(state.statsBloc)];
  const days = Number(state.statsPeriod);
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('observations').select('id, bloc_id, supervisor_id, created_at, closed_at, area, category, severity, status')
      .in('bloc_id', ids).gte('created_at', start.toISOString()).order('created_at').range(from, from + 999);
    if (error) throw error; rows.push(...data); if (data.length < 1000) break;
  }
  const [{ count: openNow }, { data: closedRows }] = await Promise.all([
    sb.from('observations').select('id', { count: 'exact', head: true }).in('bloc_id', ids).eq('status', 'open'),
    sb.from('observations').select('created_at, closed_at').in('bloc_id', ids).gte('closed_at', start.toISOString()).limit(5000),
  ]);
  const body = document.getElementById('stBody'); if (!body) return;
  body.setAttribute('aria-busy', 'false');
  const count = (key) => { const m = new Map(); rows.forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const hours = (closedRows || []).filter((r) => r.closed_at).map((r) => (new Date(r.closed_at) - new Date(r.created_at)) / 3600000).sort((a, b) => a - b);
  const median = hours.length ? hours[Math.floor(hours.length / 2)] : null;
  const fmtH = (h) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} ${t('daysShort')}`);
  const high = rows.filter((r) => r.severity === 'high' || r.severity === 'critical').length;

  // Trend: per hour today (06–20h), per day otherwise.
  let trend;
  if (days === 1) {
    trend = Array.from({ length: 15 }, (_, i) => ({ k: `${String(i + 6).padStart(2, '0')}h`, n: rows.filter((r) => new Date(r.created_at).getHours() === i + 6).length }));
  } else {
    trend = Array.from({ length: days }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); const key = localDate(d);
      return { k: d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }), n: rows.filter((r) => localDate(new Date(r.created_at)) === key).length }; });
  }
  const maxT = Math.max(1, ...trend.map((x) => x.n));
  const labelEvery = trend.length > 15 ? 5 : 1;
  const trendHtml = `<div class="vbars" role="img" aria-label="${esc(t('trend'))}">${trend.map((x, i) => `
    <div class="vbar" title="${esc(x.k)}: ${x.n}"><span class="vbar-n">${x.n || ''}</span><span class="vbar-fill" style="height:${(x.n / maxT) * 100}%"></span>
      <span class="vbar-k">${i % labelEvery === 0 ? esc(x.k) : ''}</span></div>`).join('')}</div>`;

  const hbars = (items, labelFn, opts = {}) => {
    if (!items.length) return `<p class="muted small">${esc(t('noDataPeriod'))}</p>`;
    const max = Math.max(...items.map((x) => x[1]));
    return `<ul class="hbars">${items.map(([k, n]) => `<li title="${esc(String(labelFn(k)).replace(/<[^>]+>/g, ''))}: ${n}">
      <span class="hb-label">${labelFn(k)}</span>
      <span class="hb-track"><span class="hb-fill ${opts.cls ? opts.cls(k) : ''}" style="width:${Math.max(3, (n / max) * 100)}%"></span></span>
      <span class="hb-n">${n}</span></li>`).join('')}</ul>`;
  };
  const sevOrder = ['critical', 'high', 'medium', 'low'];
  const bySev = sevOrder.map((k) => [k, rows.filter((r) => r.severity === k).length]).filter(([, n]) => n);
  const areas = count('area').filter(([a]) => a).slice(0, 5);
  const showBlocs = state.statsBloc === 'all' && ids.length > 1;

  body.innerHTML = !rows.length && !openNow ? `<div class="card empty">${icon('chart')}<p>${esc(t('noDataPeriod'))}</p></div>` : `
    <div class="kpis">
      <div class="kpi"><span class="kpi-n">${rows.length}</span><span class="kpi-l">${esc(t('kpiObs'))}</span></div>
      <div class="kpi"><span class="kpi-n">${openNow ?? 0}</span><span class="kpi-l">${esc(t('kpiOpenNow'))}</span></div>
      <div class="kpi"><span class="kpi-n">${(closedRows || []).length}</span><span class="kpi-l">${esc(t('kpiClosed'))}</span></div>
      <div class="kpi ${high ? 'kpi-warn' : ''}"><span class="kpi-n">${high}</span><span class="kpi-l">${esc(t('kpiHigh'))}</span></div>
    </div>
    <div class="card row" style="justify-content:space-between"><span>${icon('undo')} ${esc(t('timeToClose'))}</span><strong class="kpi-inline" dir="ltr">${fmtH(median)}</strong></div>
    <section class="card"><h2 class="st-h">${esc(t('trend'))}</h2>${trendHtml}</section>
    <section class="card"><h2 class="st-h">${esc(t('category'))}</h2>${hbars(count('category'), (k) => `${icon(catIcon(k))}${esc(catLabel(k))}`)}</section>
    <section class="card"><h2 class="st-h">${esc(t('severity'))}</h2>${hbars(bySev, (k) => `<span class="badge sev-${k}">${esc(sevLetter(k))}</span> ${esc(sevLabel(k))}`, { cls: (k) => 'sevfill-' + k })}</section>
    <section class="card"><h2 class="st-h">${esc(t('topAreas'))}</h2>${hbars(areas, (k) => esc(k))}</section>
    ${showBlocs ? `<section class="card"><h2 class="st-h">${esc(t('byBloc'))}</h2>${hbars(count('bloc_id'), (k) => esc(blocName(k)))}</section>` : ''}
    ${isAdmin() ? `<section class="card"><h2 class="st-h">${esc(t('supActivity'))} <span class="badge">${esc(t('admin'))}</span></h2>${hbars(count('supervisor_id'), (k) => esc(person(k)))}</section>` : ''}`;
}

// ───────── New observation ─────────
function renderNew() {
  if (!state.blocId) { location.hash = '#/'; return; }
  const bloc = state.blocs.find((b) => b.id === state.blocId);
  const s = state.settings;
  const draft = { blob: null, lat: null, lng: null, acc: null, gps: null, category: null, severity: null };
  const restricted = !isAdmin() && !!zoneOf(bloc);
  $app.innerHTML = topbar({ backTo: '#/', title: `${t('newObs')} · ${bloc.name}` }) + `<main id="main" class="page"><form id="obsForm" class="stack" novalidate>
    <div>
      <div class="photo-box" id="photoBox"><div class="photo-empty">${icon('camera')}<span>${esc(t('takePhoto'))}</span></div>
        <button type="button" class="btn primary" id="photoBtn">${icon('camera')}<span>${esc(t('takePhoto'))}</span></button></div>
      <input type="file" accept="image/*" capture="environment" id="photoInput" class="sr" tabindex="-1" aria-hidden="true">
      <p class="err small" id="err-photo" style="color:var(--danger)"></p>
    </div>
    <div class="field"><span class="lbl">${esc(t('location'))}</span>
      <div id="pickmap" dir="ltr" aria-label="${esc(t('tapMap'))}"></div>
      <p class="gps" id="gps" role="status" style="margin-top:8px">${esc(t('locating'))}</p>
      <p class="err small" id="err-gps"></p>
    </div>
    <label class="field"><span class="lbl">${esc(t('area'))}</span>
      <input class="input" name="area" list="areas" autocomplete="off" placeholder="${esc(t('areaHint'))}"><datalist id="areas"></datalist>
      <p class="err" id="err-area"></p></label>
    <fieldset class="field" style="border:0;padding:0;margin-top:16px"><legend class="lbl">${esc(t('category'))}</legend>
      <div class="chips" id="cats">${s.categories.map((c) => `<button type="button" class="chip cat-chip" data-k="${esc(c.key)}" aria-pressed="false">${icon(catIcon(c.key))}${esc(label(c))}</button>`).join('')}</div>
      <p class="err" id="err-cat"></p></fieldset>
    <fieldset class="field" style="border:0;padding:0"><legend class="lbl">${esc(t('severity'))}</legend>
      <div class="chips" id="sevs">${s.severities.map((c) => `<button type="button" class="chip" data-k="${esc(c.key)}" aria-pressed="false"><span class="badge sev-${esc(c.key)}">${esc(sevLetter(c.key))}</span>${esc(label(c))}</button>`).join('')}</div>
      <p class="err" id="err-sev"></p></fieldset>
    <label class="field"><span class="lbl">${esc(t('comment'))} <span class="muted">(${esc(t('optional'))})</span></span>
      <textarea class="input" name="comment" rows="3"></textarea></label>
    <div class="sticky-actions"><a class="btn" href="#/">${esc(t('cancel'))}</a><button class="btn primary" type="submit">${icon('check')}${esc(t('save'))}</button></div>
  </form></main>`;
  bindTopbar();

  // Photo
  const input = document.getElementById('photoInput');
  document.getElementById('photoBtn').onclick = () => input.click();
  input.onchange = async () => {
    const f = input.files?.[0]; if (!f) return;
    // A photo must be taken now: files older than 10 minutes (e.g. from the gallery) are refused for supervisors.
    if (restricted && f.lastModified && Date.now() - f.lastModified > 10 * 60 * 1000) {
      const el = document.getElementById('err-photo'); el.textContent = t('photoNotFresh'); el.style.color = 'var(--danger)'; input.value = ''; return;
    }
    try {
      draft.blob = await compressImage(f);
      const box = document.getElementById('photoBox');
      box.querySelector('.photo-empty, img')?.remove();
      const img = new Image(); img.alt = t('takePhoto'); img.src = URL.createObjectURL(draft.blob); box.prepend(img);
      document.querySelector('#photoBtn span').textContent = t('retake');
      document.getElementById('err-photo').textContent = '';
    } catch (e) { fail(e); }
  };

  // Map + GPS
  const map = L.map('pickmap').setView([bloc.center_lat, bloc.center_lng], bloc.zoom);
  state.extraMaps.push(map); baseLayers(map);
  let marker = null;
  const gpsEl = document.getElementById('gps');
  drawZone(map, bloc);
  const zoneMsg = () => {
    const z = zoneOf(bloc); if (!z || draft.lat === null) return '';
    const d = outsideBy(z, { lat: draft.lat, lng: draft.lng });
    return d > 0 ? t('outsideZone', { d: Math.round(d), b: bloc.name }) : '';
  };
  const place = (lat, lng, acc, manual) => {
    if (manual && restricted) {
      // Supervisors may only fine-tune the pin near their real GPS position.
      if (!draft.gps) { toast(t('gpsRequired'), true); if (marker && draft.lat !== null) marker.setLatLng([draft.lat, draft.lng]); return; }
      if (distanceM({ lat, lng }, draft.gps) > 50) { toast(t('tooFarFromGps'), true); marker?.setLatLng([draft.lat, draft.lng]); return; }
    }
    if (!manual) draft.gps = { lat, lng, acc };
    draft.lat = lat; draft.lng = lng; draft.acc = manual ? (draft.gps ? draft.gps.acc : null) : acc;
    if (!marker) marker = L.marker([lat, lng], { icon: pinIcon({}, true), draggable: true }).addTo(map)
      .on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng, null, true); });
    else marker.setLatLng([lat, lng]);
    if (!manual) map.setView([lat, lng], Math.max(map.getZoom(), 18));
    const out = zoneMsg();
    gpsEl.className = out ? 'gps warn' : 'gps ok';
    gpsEl.textContent = out || (manual ? `${t('tapMap')} · \u2066${lat.toFixed(6)}, ${lng.toFixed(6)}\u2069` : t('gpsOk', { a: Math.round(acc) }));
  };
  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng, null, true));
  if ('geolocation' in navigator) {
    let best = null;
    const id = navigator.geolocation.watchPosition((p) => {
      if (draft.lat !== null && (!draft.gps || draft.lat !== draft.gps.lat)) return; // user adjusted the pin
      if (!best || p.coords.accuracy < best.coords.accuracy) { best = p; place(p.coords.latitude, p.coords.longitude, p.coords.accuracy, false); }
    }, () => { if (draft.lat === null) { gpsEl.className = 'gps warn'; gpsEl.textContent = t('gpsFail'); } },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    setTimeout(() => navigator.geolocation.clearWatch(id), 30000);
    window.addEventListener('hashchange', () => navigator.geolocation.clearWatch(id), { once: true });
  } else { gpsEl.className = 'gps warn'; gpsEl.textContent = t('gpsFail'); }

  // Area suggestions
  sb.from('observations').select('area').eq('bloc_id', state.blocId).order('created_at', { ascending: false }).limit(200)
    .then(({ data }) => { const dl = document.getElementById('areas'); if (dl) dl.innerHTML = [...new Set((data || []).map((d) => d.area).filter(Boolean))].map((a) => `<option value="${esc(a)}">`).join(''); });

  // Chips
  const pick = (wrap, key) => wrap.querySelectorAll('.chip').forEach((c) => {
    c.onclick = () => { wrap.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false')); c.setAttribute('aria-pressed', 'true'); draft[key] = c.dataset.k; };
  });
  pick(document.getElementById('cats'), 'category');
  pick(document.getElementById('sevs'), 'severity');

  // Save
  const form = document.getElementById('obsForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const area = String(fd.get('area') || '').trim();
    let gpsErr = '';
    if (restricted) {
      if (!draft.gps) gpsErr = t('gpsRequired');
      else if (draft.gps.acc > 100) gpsErr = t('gpsImprecise', { a: Math.round(draft.gps.acc) });
      else gpsErr = zoneMsg();
    }
    const errs = { photo: !draft.blob && t('photoRequired'), gps: gpsErr, area: !area && t('areaRequired'), cat: !draft.category && t('chooseCategory'), sev: !draft.severity && t('chooseSeverity') };
    for (const [k, v] of Object.entries(errs)) { const el = document.getElementById('err-' + k); el.textContent = v || ''; el.style.color = 'var(--danger)'; }
    form.area.setAttribute('aria-invalid', String(!area));
    const first = Object.entries(errs).find(([, v]) => v);
    if (first) { document.getElementById('err-' + first[0]).scrollIntoView({ block: 'center' }); return; }
    await busy(form.querySelector('[type=submit]'), async () => {
      try {
        const id = crypto.randomUUID();
        const path = `${state.blocId}/${localDate()}/${id}.jpg`;
        const up = await sb.storage.from(BUCKET).upload(path, draft.blob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const { error } = await sb.from('observations').insert({
          id, bloc_id: state.blocId, supervisor_id: state.profile.id, lat: draft.lat, lng: draft.lng, gps_accuracy: draft.acc,
          area, category: draft.category, severity: draft.severity, comment: String(fd.get('comment') || '').trim(), temp_photo_path: path,
        });
        if (error) throw error;
        toast(t('saved')); state.filter = 'today'; location.hash = '#/';
      } catch (err) {
        const zm = zoneError(err);
        if (zm) { const el = document.getElementById('err-gps'); el.textContent = zm; el.style.color = 'var(--danger)'; el.scrollIntoView({ block: 'center' }); toast(zm, true); }
        else fail(err);
      }
    });
  };
}

// ───────── Detail / follow-up ─────────
async function renderDetail(id) {
  const { data: o, error } = await sb.from('observations').select('*').eq('id', id).single();
  if (error || !o) { toast(t('noObs'), true); location.hash = '#/'; return; }
  const urls = await signedUrls([o.temp_photo_path, o.closing_temp_path]);
  const photo = urls[o.temp_photo_path], after = urls[o.closing_temp_path];
  const maps = o.lat != null ? `https://www.google.com/maps?q=${o.lat},${o.lng}` : null;
  $app.innerHTML = topbar({ backTo: '#/', title: o.area || catLabel(o.category) }) + `<main id="main" class="page stack">
    ${photo ? `<img class="detail-photo" src="${esc(photo)}" alt="${esc(o.area)}">` : o.drive_link && isAdmin() ? `<a class="btn block" href="${esc(o.drive_link)}" target="_blank" rel="noopener">${icon('ext')}${esc(t('openInDrive'))}</a>` : ''}
    <div class="badges">${sevBadge(o.severity)}${statusBadge(o.status)}${catBadge(o.category)}</div>
    <div class="card"><dl class="kv">
      <dt>${esc(t('bloc'))}</dt><dd>${esc(blocName(o.bloc_id))}</dd>
      <dt>${esc(t('area'))}</dt><dd>${esc(o.area)}</dd>
      <dt>${esc(t('supervisor'))}</dt><dd>${esc(person(o.supervisor_id))}</dd>
      <dt>${esc(t('time'))}</dt><dd>${esc(new Date(o.created_at).toLocaleString(locale()))}</dd>
      <dt>${esc(t('coords'))}</dt><dd><span dir="ltr">${maps ? `<a href="${maps}" target="_blank" rel="noopener">${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}</a>${o.gps_accuracy ? ` <span class="muted">(±${Math.round(o.gps_accuracy)} m)</span>` : ''}` : '—'}</span></dd>
      ${o.comment ? `<dt>${esc(t('comment'))}</dt><dd>${esc(o.comment)}</dd>` : ''}
      ${o.drive_link && photo && isAdmin() ? `<dt>Drive</dt><dd><a href="${esc(o.drive_link)}" target="_blank" rel="noopener">${esc(t('openInDrive'))}</a></dd>` : ''}
    </dl></div>
    ${o.status === 'closed' ? `<section class="card stack"><h2>${esc(t('statusClosed'))}</h2>
        <p class="muted small">${esc(fmtDateTime(o.closed_at))} · ${esc(person(o.closed_by))}</p>
        ${o.closing_comment ? `<p>${esc(o.closing_comment)}</p>` : ''}
        ${after ? `<img class="detail-photo" src="${esc(after)}" alt="${esc(t('afterPhoto'))}">` : o.closing_photo_link && isAdmin() ? `<a href="${esc(o.closing_photo_link)}" target="_blank" rel="noopener">${esc(t('afterPhoto'))} – Drive</a>` : ''}
        <button class="btn block" id="reopen">${icon('undo')}${esc(t('reopen'))}</button></section>`
    : `<form class="card stack" id="closeForm"><h2>${esc(t('markClosed'))}</h2>
        <div><button type="button" class="btn block" id="afterBtn">${icon('camera')}<span>${esc(t('afterPhoto'))} (${esc(t('optional'))})</span></button>
          <input type="file" accept="image/*" capture="environment" id="afterInput" class="sr" tabindex="-1" aria-hidden="true">
          <img id="afterPrev" class="detail-photo" alt="${esc(t('afterPhoto'))}" hidden style="margin-top:8px"></div>
        <label class="field"><span class="lbl">${esc(t('closingComment'))} <span class="muted">(${esc(t('optional'))})</span></span><textarea class="input" name="cc" rows="2"></textarea></label>
        <button class="btn primary block" type="submit">${icon('check')}${esc(t('markClosed'))}</button></form>`}
    ${isAdmin() ? `<button class="btn danger block" id="delObs">${icon('trash')}${esc(t('deleteObs'))}</button>` : ''}
  </main>${bottomNav('')}`;
  bindTopbar(); bindBottomNav();
  const delBtn = document.getElementById('delObs');
  if (delBtn) delBtn.onclick = () => {
    if (!confirm(t('confirmDeleteObs'))) return;
    busy(delBtn, async () => {
      try {
        // Remove the app's temporary photo copies (the Google Drive archive is kept), then the observation.
        const paths = [o.temp_photo_path, o.closing_temp_path].filter(Boolean);
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
        const { error: er } = await sb.from('observations').delete().eq('id', o.id);
        if (er) throw er;
        toast(t('deletedOk')); location.hash = '#/';
      } catch (err) { fail(err); }
    });
  };
  if (o.status === 'closed') {
    document.getElementById('reopen').onclick = (e) => busy(e.currentTarget, async () => {
      const { error: er } = await sb.from('observations').update({ status: 'open', closed_at: null, closed_by: null }).eq('id', o.id);
      if (er) return fail(er); toast(t('reopenedOk')); renderDetail(o.id);
    });
    return;
  }
  let afterBlob = null;
  const inp = document.getElementById('afterInput');
  document.getElementById('afterBtn').onclick = () => inp.click();
  inp.onchange = async () => {
    const f = inp.files?.[0]; if (!f) return;
    afterBlob = await compressImage(f);
    const p = document.getElementById('afterPrev'); p.src = URL.createObjectURL(afterBlob); p.hidden = false;
  };
  const form = document.getElementById('closeForm');
  form.onsubmit = (e) => { e.preventDefault(); busy(form.querySelector('[type=submit]'), async () => {
    try {
      const patch = { status: 'closed', closed_at: new Date().toISOString(), closed_by: state.profile.id, closing_comment: form.cc.value.trim() };
      if (afterBlob) {
        const path = `${o.bloc_id}/${localDate()}/${o.id}-after-${Date.now()}.jpg`;
        const up = await sb.storage.from(BUCKET).upload(path, afterBlob, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        patch.closing_temp_path = path; patch.closing_photo_link = null;
      }
      const { error: er } = await sb.from('observations').update(patch).eq('id', o.id);
      if (er) throw er;
      toast(t('closedOk')); renderDetail(o.id);
    } catch (err) { fail(err); }
  }); };
}

// ───────── Admin ─────────
async function renderAdmin(tab) {
  const tabs = ['blocs', 'users', 'recipients', 'settings', 'reports', 'export'];
  $app.innerHTML = topbar({ backTo: '#/', title: t('admin') }) + `<main id="main" class="page wide">
    <div class="row" style="justify-content:flex-end;margin-bottom:8px"><a class="btn" id="driveRoot" href="#" target="_blank" rel="noopener" hidden>${icon('ext')}${esc(t('driveArchive'))}</a></div>
    <div class="tabs" role="tablist">${tabs.map((k) => `<button role="tab" aria-selected="${k === tab}" data-tab="${k}">${icon({ blocs: 'layers', users: 'users', recipients: 'mail', settings: 'sliders', reports: 'file', export: 'download' }[k])}${esc(t(k))}</button>`).join('')}</div>
    <section id="pane" role="tabpanel"><p class="muted">…</p></section></main>${bottomNav('admin')}`;
  bindTopbar(); bindBottomNav();
  $app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => (location.hash = `#/admin/${b.dataset.tab}`)));
  const pane = document.getElementById('pane');
  driveLinks().then((l) => { const a = document.getElementById('driveRoot'); if (a && l?.root) { a.href = l.root; a.hidden = false; } });
  try { await ({ blocs: adminBlocs, users: adminUsers, recipients: adminRecipients, settings: adminSettings, reports: adminReports, export: adminExport })[tab](pane); }
  catch (e) { fail(e); }
}
async function refreshBlocs() { const { data } = await sb.from('blocs').select('*').order('id'); state.blocs = data || []; state.myBlocIds = state.blocs.filter((b) => b.active).map((b) => b.id); }

// Drive folder links written by the report engine (branding/drive.json, admin-only bucket).
let driveLinksCache = null;
async function driveLinks() {
  if (driveLinksCache) return driveLinksCache;
  try {
    const { data, error } = await sb.storage.from('branding').download('drive.json');
    if (error || !data) return null;
    driveLinksCache = JSON.parse(await data.text());
    return driveLinksCache;
  } catch { return null; }
}

async function adminBlocs(pane) {
  await refreshBlocs();
  const sel = state.blocs[0];
  pane.innerHTML = `<div class="stack">
    <div class="card"><table class="table"><thead><tr><th>${esc(t('name'))}</th><th>${esc(t('zoneRadius'))}</th><th>${esc(t('active'))}</th><th></th></tr></thead><tbody>
      ${state.blocs.map((b) => `<tr><td><input class="input" data-name="${b.id}" value="${esc(b.name)}" aria-label="${esc(t('name'))}"></td>
        <td><input class="input" type="number" min="0" step="50" inputmode="numeric" style="width:110px" data-radius="${b.id}" value="${b.geofence_m ?? 0}" aria-label="${esc(t('zoneRadius'))} – ${esc(b.name)}"></td>
        <td><label class="check"><input type="checkbox" data-active="${b.id}" ${b.active ? 'checked' : ''}><span class="sr">${esc(t('active'))}</span></label></td>
        <td><div class="row"><button class="btn" data-save="${b.id}">${esc(t('save'))}</button><a class="btn ghost" data-drive="${esc(b.name)}" href="#" target="_blank" rel="noopener" hidden>${icon('ext')}Drive</a></div></td></tr>`).join('')}
    </tbody></table>
    <p class="small muted" style="margin-top:8px">${esc(t('zoneHelp'))}</p>
    <form id="addBloc" class="row" style="margin-top:12px"><label class="sr" for="nb">${esc(t('name'))}</label><input id="nb" class="input grow" placeholder="Bloc 11" required><button class="btn primary">${icon('plus')}${esc(t('add'))}</button></form></div>
    <div class="card stack"><div class="row"><label class="lbl" for="centerSel" style="font-weight:600">${esc(t('bloc'))}</label>
      <select id="centerSel" class="input" style="width:auto">${state.blocs.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></div>
      <div id="adminmap" dir="ltr"></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn primary" id="setCenter">${icon('locate')}${esc(t('setCenter'))}</button></div>
      <div class="zone-tools stack" style="border-top:1px solid var(--border);padding-top:12px">
        <p class="small muted" id="zoneInfo"></p>
        <div class="row" style="flex-wrap:wrap">
          <button class="btn" id="zoneDraw">${icon('pin')}${esc(t('drawZone'))}</button>
          <button class="btn" id="zoneUndo" hidden>${icon('undo')}${esc(t('undoPoint'))}</button>
          <button class="btn primary" id="zoneSave" hidden>${icon('check')}${esc(t('saveZone'))}</button>
          <button class="btn danger" id="zoneClear">${icon('trash')}${esc(t('clearZone'))}</button>
        </div>
      </div></div></div>`;
  driveLinks().then((l) => pane.querySelectorAll('[data-drive]').forEach((a) => { const u = l?.blocs?.[a.dataset.drive]; if (u) { a.href = u; a.hidden = false; a.setAttribute('aria-label', `Google Drive – ${a.dataset.drive}`); } }));
  pane.querySelectorAll('[data-save]').forEach((b) => (b.onclick = () => busy(b, async () => {
    const id = Number(b.dataset.save);
    const radius = Math.max(0, Math.round(Number(pane.querySelector(`[data-radius="${id}"]`).value) || 0));
    const { error } = await sb.from('blocs').update({ name: pane.querySelector(`[data-name="${id}"]`).value.trim(), active: pane.querySelector(`[data-active="${id}"]`).checked, geofence_m: radius }).eq('id', id);
    if (error) return fail(error); await refreshBlocs(); showZone(); toast(t('settingsSaved'));
  })));
  pane.querySelector('#addBloc').onsubmit = async (e) => {
    e.preventDefault(); const name = pane.querySelector('#nb').value.trim(); if (!name) return;
    const { error } = await sb.from('blocs').insert({ name, center_lat: sel?.center_lat ?? 33.105, center_lng: sel?.center_lng ?? -8.637 });
    if (error) return fail(error); adminBlocs(pane);
  };
  let zoneLayer = null;
  function showZone() {
    if (!map) return;
    zoneLayer?.remove(); zoneLayer = drawZone(map, state.blocs.find((x) => x.id === Number(cs.value)));
  }
  if (!sel) return;
  var map = L.map('adminmap').setView([sel.center_lat, sel.center_lng], sel.zoom); state.extraMaps.push(map); baseLayers(map);
  const cs = pane.querySelector('#centerSel');
  showZone();
  cs.onchange = () => { stopDrawing(); const b = state.blocs.find((x) => x.id === Number(cs.value)); map.setView([b.center_lat, b.center_lng], b.zoom); showZone(); zoneInfo(); };

  // Draw the Bloc outline by tapping its corners.
  let drawing = false, pts = [], sketch = null;
  const $ = (id) => pane.querySelector('#' + id);
  const curBloc = () => state.blocs.find((x) => x.id === Number(cs.value));
  function zoneInfo() {
    const b = curBloc(), z = zoneOf(b);
    $('zoneInfo').textContent = drawing ? t('drawHelp', { n: pts.length })
      : z?.poly ? t('zoneDrawn', { n: z.poly.length }) : z ? t('zoneCircle', { r: z.r }) : t('zoneNone');
    $('zoneClear').hidden = drawing || !(z?.poly);
  }
  function redraw() {
    sketch?.remove();
    sketch = pts.length >= 3 ? L.polygon(pts, { ...ZONE_STYLE, dashArray: null, color: '#C2410C', fillColor: '#C2410C' }).addTo(map)
      : L.polyline(pts, { color: '#C2410C', weight: 2 }).addTo(map);
    pts.forEach((p) => { const m = L.circleMarker(p, { radius: 6, color: '#C2410C', fillColor: '#fff', fillOpacity: 1, weight: 2, interactive: false }).addTo(map); m._jphPt = true; });
    zoneInfo();
  }
  function clearPoints() { map.eachLayer((l) => { if (l._jphPt) l.remove(); }); }
  function stopDrawing() {
    drawing = false; pts = []; clearPoints(); sketch?.remove(); sketch = null;
    $('zoneDraw').hidden = false; $('zoneUndo').hidden = true; $('zoneSave').hidden = true; map.getContainer().style.cursor = '';
  }
  map.on('click', (e) => { if (!drawing) return; pts.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]); clearPoints(); redraw(); });
  $('zoneDraw').onclick = () => {
    drawing = true; pts = []; zoneLayer?.remove(); $('zoneDraw').hidden = true; $('zoneUndo').hidden = false; $('zoneSave').hidden = false;
    map.getContainer().style.cursor = 'crosshair'; zoneInfo();
  };
  $('zoneUndo').onclick = () => { pts.pop(); clearPoints(); redraw(); };
  $('zoneSave').onclick = (e) => {
    if (pts.length < 3) { toast(t('zoneNeed3'), true); return; }
    busy(e.currentTarget, async () => {
      const zone = pts.slice();
      // Centre the Bloc on its zone so the supervisors' map opens on it.
      const lat = zone.reduce((s, p) => s + p[0], 0) / zone.length, lng = zone.reduce((s, p) => s + p[1], 0) / zone.length;
      const { error } = await sb.from('blocs').update({ zone, center_lat: lat, center_lng: lng, zoom: map.getZoom() }).eq('id', Number(cs.value));
      if (error) return fail(error);
      stopDrawing(); await refreshBlocs(); showZone(); zoneInfo(); toast(t('zoneSaved'));
    });
  };
  $('zoneClear').onclick = (e) => {
    if (!confirm(t('confirmRemove'))) return;
    busy(e.currentTarget, async () => {
      const { error } = await sb.from('blocs').update({ zone: null }).eq('id', Number(cs.value));
      if (error) return fail(error); await refreshBlocs(); showZone(); zoneInfo(); toast(t('zoneSaved'));
    });
  };
  zoneInfo();
  pane.querySelector('#setCenter').onclick = (e) => busy(e.currentTarget, async () => {
    const c = map.getCenter();
    const { error } = await sb.from('blocs').update({ center_lat: c.lat, center_lng: c.lng, zoom: map.getZoom() }).eq('id', Number(cs.value));
    if (error) return fail(error); await refreshBlocs(); showZone(); toast(t('centerSaved'));
  });
}

async function adminUsers(pane) {
  const [{ data: users }, { data: links }] = await Promise.all([
    sb.from('profiles').select('*').order('username'), sb.from('bloc_supervisors').select('*'),
  ]);
  await refreshBlocs();
  state.people = Object.fromEntries((users || []).map((p) => [p.id, p]));
  const has = (u, b) => (links || []).some((l) => l.user_id === u && l.bloc_id === b);
  const blocChecks = (uid) => state.blocs.map((b) => `<label class="check small"><input type="checkbox" data-link="${uid || ''}" value="${b.id}" ${uid && has(uid, b.id) ? 'checked' : ''}>${esc(b.name)}</label>`).join(' ');
  pane.innerHTML = `<div class="stack">
    ${(users || []).map((u) => `<div class="card stack" data-user="${u.id}">
      <div class="row"><strong class="grow">${esc(u.username)}</strong>${u.active ? '' : `<span class="badge">${esc(t('active'))}: ✕</span>`}</div>
      <div class="form-grid two">
        <label class="field"><span class="lbl">${esc(t('fullName'))}</span><input class="input" name="full_name" value="${esc(u.full_name)}"></label>
        <label class="field"><span class="lbl">${esc(t('role'))}</span><select class="input" name="role">
          <option value="supervisor" ${u.role === 'supervisor' ? 'selected' : ''}>${esc(t('supervisor'))}</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${esc(t('administrator'))}</option></select></label>
      </div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="lbl small" style="font-weight:600">${esc(t('assignedBlocs'))}</legend><div class="chips">${blocChecks(u.id)}</div></fieldset>
      <label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}>${esc(t('active'))}</label>
      <button class="btn primary" data-act="save">${esc(t('save'))}</button>
      <div class="row" style="flex-wrap:wrap;border-top:1px solid var(--border);padding-top:12px">
        <label class="sr" for="pw-${u.id}">${esc(t('newPassword'))}</label>
        <input id="pw-${u.id}" class="input grow" name="pw" type="password" autocomplete="new-password" placeholder="${esc(t('newPassword'))}" style="min-width:160px">
        <button class="btn" data-act="pw">${esc(t('setPassword'))}</button></div>
    </div>`).join('')}
    <form class="card stack" id="newUser"><h2>${esc(t('add'))} · ${esc(t('users'))}</h2>
      <div class="form-grid two">
        <label class="field"><span class="lbl">${esc(t('username'))}</span><input class="input" name="username" required autocapitalize="none" pattern="[A-Za-z0-9._\\-]{3,30}"></label>
        <label class="field"><span class="lbl">${esc(t('fullName'))}</span><input class="input" name="full_name" required></label>
        <label class="field"><span class="lbl">${esc(t('password'))}</span><input class="input" name="password" type="password" autocomplete="new-password" minlength="8" required><span class="hint">≥ 8</span></label>
        <label class="field"><span class="lbl">${esc(t('role'))}</span><select class="input" name="role"><option value="supervisor">${esc(t('supervisor'))}</option><option value="admin">${esc(t('administrator'))}</option></select></label>
      </div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="lbl small" style="font-weight:600">${esc(t('assignedBlocs'))}</legend><div class="chips">${blocChecks(null)}</div></fieldset>
      <button class="btn primary" type="submit">${icon('plus')}${esc(t('add'))}</button></form></div>`;

  pane.querySelectorAll('[data-user]').forEach((card) => {
    const uid = card.dataset.user;
    card.querySelector('[data-act=save]').onclick = (e) => busy(e.currentTarget, async () => {
      const { error } = await sb.rpc('admin_update_user', { p_user: uid, p_full_name: card.querySelector('[name=full_name]').value.trim(), p_role: card.querySelector('[name=role]').value, p_active: card.querySelector('[name=active]').checked });
      if (error) return fail(error);
      const chosen = [...card.querySelectorAll('[data-link]')].filter((c) => c.checked).map((c) => Number(c.value));
      const del = await sb.from('bloc_supervisors').delete().eq('user_id', uid); if (del.error) return fail(del.error);
      if (chosen.length) { const ins = await sb.from('bloc_supervisors').insert(chosen.map((b) => ({ bloc_id: b, user_id: uid }))); if (ins.error) return fail(ins.error); }
      toast(t('settingsSaved'));
    });
    card.querySelector('[data-act=pw]').onclick = (e) => busy(e.currentTarget, async () => {
      const pw = card.querySelector('[name=pw]').value;
      const { error } = await sb.rpc('admin_set_password', { p_user: uid, p_password: pw });
      if (error) return fail(error); card.querySelector('[name=pw]').value = ''; toast(t('passwordSet'));
    });
  });
  const nf = pane.querySelector('#newUser');
  nf.onsubmit = (e) => { e.preventDefault(); busy(nf.querySelector('[type=submit]'), async () => {
    const fd = new FormData(nf);
    const { data: uid, error } = await sb.rpc('admin_create_user', { p_username: fd.get('username'), p_full_name: fd.get('full_name'), p_password: fd.get('password'), p_role: fd.get('role') });
    if (error) return fail(error);
    const chosen = [...nf.querySelectorAll('[data-link]')].filter((c) => c.checked).map((c) => ({ bloc_id: Number(c.value), user_id: uid }));
    if (chosen.length) { const ins = await sb.from('bloc_supervisors').insert(chosen); if (ins.error) return fail(ins.error); }
    toast(t('userCreated')); adminUsers(pane);
  }); };
}

async function adminRecipients(pane, blocId) {
  await refreshBlocs();
  blocId = blocId || state.blocs[0]?.id;
  const { data: recs, error } = await sb.from('bloc_recipients').select('*').eq('bloc_id', blocId).order('email');
  if (error) throw error;
  pane.innerHTML = `<div class="card stack">
    <div class="row"><label for="rb" class="lbl" style="font-weight:600">${esc(t('bloc'))}</label>
      <select id="rb" class="input" style="width:auto">${state.blocs.map((b) => `<option value="${b.id}" ${b.id === blocId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
    <div style="overflow-x:auto"><table class="table"><thead><tr><th>${esc(t('email'))}</th><th>${esc(t('name'))}</th><th>${esc(t('daily'))}</th><th>${esc(t('weekly'))}</th><th></th></tr></thead><tbody>
      ${(recs || []).length ? recs.map((r) => `<tr><td>${esc(r.email)}</td><td>${esc(r.name)}</td>
        <td><label class="check"><input type="checkbox" data-d="${r.id}" ${r.daily ? 'checked' : ''}><span class="sr">${esc(t('daily'))}</span></label></td>
        <td><label class="check"><input type="checkbox" data-w="${r.id}" ${r.weekly ? 'checked' : ''}><span class="sr">${esc(t('weekly'))}</span></label></td>
        <td><button class="btn danger icon-btn" data-del="${r.id}" aria-label="${esc(t('remove'))} ${esc(r.email)}">${icon('trash')}</button></td></tr>`).join('')
        : `<tr><td colspan="5" class="muted">${esc(t('none'))}</td></tr>`}
    </tbody></table></div>
    <form id="addRec" class="form-grid two">
      <label class="field"><span class="lbl">${esc(t('email'))}</span><input class="input" name="email" type="email" required></label>
      <label class="field"><span class="lbl">${esc(t('name'))}</span><input class="input" name="name"></label>
      <div class="row"><label class="check"><input type="checkbox" name="daily" checked>${esc(t('daily'))}</label><label class="check"><input type="checkbox" name="weekly" checked>${esc(t('weekly'))}</label></div>
      <button class="btn primary" type="submit">${icon('plus')}${esc(t('add'))}</button>
    </form></div>`;
  pane.querySelector('#rb').onchange = (e) => adminRecipients(pane, Number(e.target.value));
  const upd = async (id, patch) => { const { error: er } = await sb.from('bloc_recipients').update(patch).eq('id', id); if (er) fail(er); else toast(t('settingsSaved')); };
  pane.querySelectorAll('[data-d]').forEach((c) => (c.onchange = () => upd(c.dataset.d, { daily: c.checked })));
  pane.querySelectorAll('[data-w]').forEach((c) => (c.onchange = () => upd(c.dataset.w, { weekly: c.checked })));
  pane.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!confirm(t('confirmRemove'))) return;
    const { error: er } = await sb.from('bloc_recipients').delete().eq('id', b.dataset.del); if (er) return fail(er); adminRecipients(pane, blocId);
  }));
  const f = pane.querySelector('#addRec');
  f.onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(f);
    const { error: er } = await sb.from('bloc_recipients').insert({ bloc_id: blocId, email: String(fd.get('email')).trim().toLowerCase(), name: String(fd.get('name') || '').trim(), daily: !!fd.get('daily'), weekly: !!fd.get('weekly') });
    if (er) return fail(er); adminRecipients(pane, blocId);
  };
}

async function adminSettings(pane) {
  const { data: s, error } = await sb.from('settings').select('*').eq('id', 1).single();
  if (error) throw error;
  const catsText = s.categories.map((c) => `${c.key} | ${c.en} | ${c.fr} | ${c.ar || ''}`).join('\n');
  pane.innerHTML = `<form class="card stack" id="setForm"><div class="form-grid two">
    <label class="field"><span class="lbl">${esc(t('dailyTime'))}</span><input class="input" type="time" name="daily_time" value="${esc(s.daily_time)}"></label>
    <label class="field"><span class="lbl">${esc(t('noInputTime'))}</span><input class="input" type="time" name="no_input_time" value="${esc(s.no_input_time)}"></label>
    <label class="field"><span class="lbl">${esc(t('weeklyDay'))}</span><select class="input" name="weekly_day">${t('days').map((d, i) => `<option value="${i + 1}" ${s.weekly_day === i + 1 ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
    <label class="field"><span class="lbl">${esc(t('weeklyTime'))}</span><input class="input" type="time" name="weekly_time" value="${esc(s.weekly_time)}"></label>
    <label class="field"><span class="lbl">${esc(t('senderName'))}</span><input class="input" name="sender_name" value="${esc(s.sender_name)}"></label>
    <label class="field"><span class="lbl">${esc(t('reportLanguage'))}</span><select class="input" name="report_language">
      <option value="both" ${s.report_language === 'both' ? 'selected' : ''}>${esc(t('both'))}</option>
      <option value="fr" ${s.report_language === 'fr' ? 'selected' : ''}>Français</option>
      <option value="en" ${s.report_language === 'en' ? 'selected' : ''}>English</option></select></label>
    ${'report_formats' in s ? `<label class="field"><span class="lbl">${esc(t('reportFiles'))}</span><select class="input" name="report_formats">
      ${[['both', t('filesBoth')], ['pdf', 'PDF'], ['docx', 'Word (.docx)']].map(([v, l]) => `<option value="${v}" ${s.report_formats === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}
    </div>
    <label class="field"><span class="lbl">${esc(t('alertEmails'))}</span><input class="input" name="alert_emails" value="${esc((s.alert_emails || []).join(', '))}"></label>
    <label class="field"><span class="lbl">${esc(t('category'))}</span><textarea class="input" name="categories" rows="9" style="font-family:ui-monospace,monospace;font-size:14px">${esc(catsText)}</textarea>
      <span class="hint">key | English | Français | العربية</span></label>
    <p class="small muted">${esc(t('severity'))}: ${s.severities.map((x) => esc(label(x))).join(' · ')} · Timezone: ${esc(s.timezone)}</p>
    <button class="btn primary" type="submit">${esc(t('saveSettings'))}</button></form>`;
  const f = pane.querySelector('#setForm');
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
    const fd = new FormData(f);
    const categories = String(fd.get('categories')).split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0])
      .map(([key, en, fr, ar]) => ({ key: key.toLowerCase().replace(/\s+/g, '_'), en: en || key, fr: fr || en || key, ...(ar ? { ar } : {}) }));
    const patch = {
      daily_time: fd.get('daily_time'), no_input_time: fd.get('no_input_time'), weekly_day: Number(fd.get('weekly_day')), weekly_time: fd.get('weekly_time'),
      sender_name: String(fd.get('sender_name')).trim(), report_language: fd.get('report_language'),
      alert_emails: String(fd.get('alert_emails')).split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), categories,
      ...(fd.get('report_formats') ? { report_formats: fd.get('report_formats') } : {}),
    };
    const { error: er } = await sb.from('settings').update(patch).eq('id', 1);
    if (er) return fail(er); state.settings = { ...state.settings, ...patch }; toast(t('settingsSaved'));
  }); };
}

// Manual report: the database asks GitHub to run the report engine (about 1–2 minutes).
function genReportCard() {
  const today = localDate();
  return `<form class="card stack" id="genForm"><h2 class="st-h">${icon('file')}${esc(t('genReport'))}</h2>
    <div class="form-grid two">
      <label class="field"><span class="lbl">${esc(t('bloc'))}</span><select class="input" name="bloc"><option value="">${esc(t('allBlocs'))}</option>
        ${state.blocs.filter((b) => b.active).map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">${esc(t('type'))}</span><select class="input" name="type">
        <option value="daily">${esc(t('daily'))}</option><option value="weekly">${esc(t('weekly'))}</option></select></label>
      <label class="field"><span class="lbl">${esc(t('reportDate'))}</span><input class="input" type="date" name="date" value="${today}" max="${today}" required>
        <span class="hint" id="genHint">${esc(t('dailyHint'))}</span></label>
      <label class="check" style="align-self:end"><input type="checkbox" name="send">${esc(t('sendToRecipients'))}</label>
    </div>
    <div class="row"><button class="btn primary" type="submit">${icon('file')}${esc(t('generate'))}</button></div>
    <div id="genList"></div></form>`;
}
async function bindGenReport(pane) {
  const f = pane.querySelector('#genForm'); if (!f) return;
  f.type.onchange = () => { pane.querySelector('#genHint').textContent = t(f.type.value === 'weekly' ? 'weeklyHint' : 'dailyHint'); };
  const list = pane.querySelector('#genList');
  let timer = null;
  const show = async () => {
    const { data, error } = await sb.from('report_requests').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) { list.innerHTML = `<p class="small muted">${esc(t('genNeedsSetup'))}</p>`; return false; }
    list.innerHTML = (data || []).length ? `<ul class="req-list">${data.map((r) => {
      const st = { queued: t('stQueued'), running: t('stRunning'), done: t('stDone'), error: t('stError') }[r.status] || r.status;
      const links = (r.result || []).map((x) => `<span class="req-res">${esc(x.bloc)}: ${x.pdf_link ? `<a href="${esc(x.pdf_link)}" target="_blank" rel="noopener">PDF</a>` : ''}${x.pdf_link && x.docx_link ? ' · ' : ''}${x.docx_link ? `<a href="${esc(x.docx_link)}" target="_blank" rel="noopener">Word</a>` : ''}${x.status === 'sent' ? ` · ${esc(t('emailed'))}` : ''}${x.status === 'no_recipients' ? ` · ${esc(t('noRecipientsShort'))}` : ''}</span>`).join('');
      return `<li><span class="badge ${r.status === 'done' ? 'st-closed' : r.status === 'error' ? 'sev-critical' : 'st-open'}">${esc(st)}</span>
        <span>${esc(r.type === 'weekly' ? t('weekly') : t('daily'))} · ${esc(r.bloc_id ? blocName(r.bloc_id) : t('allBlocs'))} · ${esc(r.period_date)}${r.send_email ? ` · ${esc(t('emailed'))}` : ''}</span>
        ${links ? `<span class="req-links">${links}</span>` : ''}${r.status === 'error' && r.error ? `<span class="small" style="color:var(--danger)">${esc(r.error.slice(0, 160))}</span>` : ''}</li>`;
    }).join('')}</ul>` : '';
    return (data || []).some((r) => r.status === 'queued' || r.status === 'running');
  };
  const poll = async () => { clearTimeout(timer); if (!document.body.contains(list)) return; if (await show()) timer = setTimeout(poll, 6000); };
  poll();
  f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
    const fd = new FormData(f);
    if (fd.get('send') && !confirm(t('confirmSend'))) return;
    const { error } = await sb.from('report_requests').insert({ bloc_id: fd.get('bloc') ? Number(fd.get('bloc')) : null, type: fd.get('type'), period_date: fd.get('date'), send_email: !!fd.get('send') });
    if (error) return fail(error);
    toast(t('requestQueued')); poll();
  }); };
}

async function adminReports(pane) {
  const { data, error } = await sb.from('reports').select('*').order('sent_at', { ascending: false }).limit(60);
  if (error) throw error;
  pane.innerHTML = `${genReportCard()}
    <div class="card" style="overflow-x:auto"><table class="table"><thead><tr><th>${esc(t('sentAt'))}</th><th>${esc(t('bloc'))}</th><th>${esc(t('type'))}</th><th>${esc(t('period'))}</th><th>${esc(t('recipients'))}</th><th>${esc(t('files'))}</th></tr></thead><tbody>
    ${(data || []).length ? data.map((r) => `<tr><td>${esc(fmtDateTime(r.sent_at))}</td><td>${esc(blocName(r.bloc_id))}</td><td>${esc(r.type)}${r.status !== 'sent' ? ` <span class="badge sev-high">${esc(r.status)}</span>` : ''}</td><td>${esc(r.period)}</td>
      <td class="small">${esc((r.recipients || []).join(', '))}${r.note ? `<br><span class="muted">${esc(r.note)}</span>` : ''}</td>
      <td class="nowrap">${r.pdf_link ? `<a href="${esc(r.pdf_link)}" target="_blank" rel="noopener">PDF</a>` : ''}${r.docx_link ? ` · <a href="${esc(r.docx_link)}" target="_blank" rel="noopener">Word</a>` : ''}</td></tr>`).join('')
      : `<tr><td colspan="6" class="muted">${esc(t('none'))}</td></tr>`}</tbody></table></div>
    <h2 class="st-h" style="margin-top:24px">${icon('trash')}${esc(t('deletedLog'))}</h2>
    <div class="card" style="overflow-x:auto" id="delLog"><p class="muted">…</p></div>`;
  bindGenReport(pane);
  const { data: dl, error: de } = await sb.from('deleted_observations').select('*').order('deleted_at', { ascending: false }).limit(100);
  const box = pane.querySelector('#delLog');
  if (de) { box.innerHTML = `<p class="muted small">${esc(t('none'))}</p>`; return; }
  box.innerHTML = `<table class="table"><thead><tr><th>${esc(t('deletedAt'))}</th><th>${esc(t('deletedBy'))}</th><th>${esc(t('bloc'))}</th><th>${esc(t('area'))}</th><th>${esc(t('category'))}</th><th>${esc(t('time'))}</th><th>Drive</th></tr></thead><tbody>
    ${(dl || []).length ? dl.map((r) => { const o = r.data || {}; return `<tr><td>${esc(fmtDateTime(r.deleted_at))}</td><td>${esc(person(r.deleted_by))}</td><td>${esc(blocName(r.bloc_id))}</td>
      <td>${esc(o.area || '')}</td><td>${esc(catLabel(o.category))}</td><td>${o.created_at ? esc(fmtDateTime(o.created_at)) : ''} · ${esc(person(o.supervisor_id))}</td>
      <td>${o.drive_link ? `<a href="${esc(o.drive_link)}" target="_blank" rel="noopener">${icon('ext')}<span class="sr">Drive</span></a>` : ''}</td></tr>`; }).join('')
      : `<tr><td colspan="7" class="muted">${esc(t('none'))}</td></tr>`}</tbody></table>`;
}

// ───────── Export (Excel / CSV) ─────────
async function adminExport(pane) {
  await refreshBlocs();
  const today = localDate(), monthAgo = localDate(new Date(Date.now() - 30 * 86400000));
  pane.innerHTML = `<form class="card stack" id="expForm"><h2>${esc(t('exportTitle'))}</h2>
    <p class="small muted">${esc(t('exportHelp'))}</p>
    <div class="form-grid two">
      <label class="field"><span class="lbl">${esc(t('bloc'))}</span><select class="input" name="bloc"><option value="">${esc(t('allBlocs'))}</option>
        ${state.blocs.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">${esc(t('status'))}</span><select class="input" name="status">
        <option value="">${esc(t('allStatus'))}</option><option value="open">${esc(t('statusOpen'))}</option><option value="closed">${esc(t('statusClosed'))}</option></select></label>
      <label class="field"><span class="lbl">${esc(t('dateFrom'))}</span><input class="input" type="date" name="from" value="${monthAgo}" required></label>
      <label class="field"><span class="lbl">${esc(t('dateTo'))}</span><input class="input" type="date" name="to" value="${today}" required></label>
    </div>
    <p class="err small" id="expMsg" role="status"></p>
    <div class="row" style="flex-wrap:wrap"><button class="btn primary" type="submit" data-fmt="xlsx">${esc(t('downloadXlsx'))}</button>
      <button class="btn" type="submit" data-fmt="csv">${esc(t('downloadCsv'))}</button></div></form>`;
  const f = pane.querySelector('#expForm');
  f.onsubmit = (e) => {
    e.preventDefault();
    const btn = e.submitter || f.querySelector('[data-fmt=xlsx]');
    busy(btn, async () => {
      const msg = pane.querySelector('#expMsg'); msg.textContent = ''; msg.style.color = 'var(--text-2)';
      try {
        const fd = new FormData(f);
        const from = new Date(`${fd.get('from')}T00:00:00`), to = new Date(`${fd.get('to')}T00:00:00`); to.setDate(to.getDate() + 1);
        const rows = [];
        for (let start = 0; ; start += 1000) { // Supabase returns at most 1000 rows per request
          let q = sb.from('observations').select('*').gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
            .order('created_at', { ascending: true }).range(start, start + 999);
          if (fd.get('bloc')) q = q.eq('bloc_id', Number(fd.get('bloc')));
          if (fd.get('status')) q = q.eq('status', fd.get('status'));
          const { data, error } = await q; if (error) throw error;
          rows.push(...data); if (data.length < 1000) break;
        }
        if (!rows.length) { msg.textContent = t('noData'); return; }
        const fmt = (iso) => (iso ? new Date(iso) : null);
        const pad2 = (n) => String(n).padStart(2, '0');
        const d = (x) => (x ? `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}` : '');
        const tm = (x) => (x ? `${pad2(x.getHours())}:${pad2(x.getMinutes())}` : '');
        const header = [t('bloc'), 'Date', t('time'), t('area'), t('category'), t('severity'), t('status'), t('supervisor'),
          'Latitude', 'Longitude', 'GPS ± m', t('comment'), `${t('statusClosed')} – Date`, `${t('statusClosed')} – ${t('by')}`, t('closingComment'), 'Photo (Drive)', `${t('afterPhoto')} (Drive)`, 'ID'];
        const data = rows.map((o) => { const c = fmt(o.created_at), cl = fmt(o.closed_at); return [
          blocName(o.bloc_id), d(c), tm(c), o.area, catLabel(o.category), sevLabel(o.severity), o.status === 'closed' ? t('statusClosed') : t('statusOpen'),
          person(o.supervisor_id), o.lat ?? '', o.lng ?? '', o.gps_accuracy != null ? Math.round(o.gps_accuracy) : '', o.comment,
          cl ? `${d(cl)} ${tm(cl)}` : '', o.closed_by ? person(o.closed_by) : '', o.closing_comment || '', o.drive_link || '', o.closing_photo_link || '', o.id]; });
        const base = `JPH_Housekeeping_${fd.get('bloc') ? blocName(Number(fd.get('bloc'))).replace(/\s+/g, '_') : 'all'}_${fd.get('from')}_${fd.get('to')}`;
        if (btn.dataset.fmt === 'csv') {
          const cell = (v) => { const x = String(v ?? ''); return /[",;\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
          const csv = '\ufeff' + [header, ...data].map((r) => r.map(cell).join(';')).join('\r\n'); // BOM + ';' so Excel opens accents and Arabic correctly
          saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
        } else {
          const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
          const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
          ws['!cols'] = header.map((h, i) => ({ wch: [10, 11, 7, 22, 16, 11, 10, 20, 11, 11, 8, 40, 17, 18, 30, 30, 30, 10][i] || 14 }));
          ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: header.length - 1 } }) };
          const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Observations');
          saveBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${base}.xlsx`);
        }
        msg.textContent = t('exported', { n: rows.length });
      } catch (err) { fail(err); }
    });
  };
}
function saveBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ───────── Boot ─────────
window.addEventListener('online', () => route());
window.addEventListener('offline', () => route());
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') { state.session = null; state.profile = null; location.hash = '#/'; renderLogin(); }
  else if (session) state.session = session;
});
(async () => {
  applyDir();
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  await route();
})().catch(fail);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
