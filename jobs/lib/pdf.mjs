// PDF layout (A4, light theme) in the JESA corporate style: navy titles, JESA blues for charts,
// wave background + logos when the branding files are available (Supabase bucket "branding").
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { fmtHours } from './analysis.mjs';

const C = {
  // JESA tokens: navy #253C8D, blue #0483BA, cyan #00BBED, ink #010202, grey-light #CECECE, mist #E2EEEF
  text: '#010202', text2: '#4B5563', border: '#CECECE', muted: '#E2EEEF', primary: '#253C8D', primarySoft: '#E2EEEF',
  blue: '#0483BA', cyan: '#00BBED', royal: '#0361AB',
  warnBg: '#FFF7ED', warnFg: '#9A3412',
  sev: { low: ['#E2E8F0', '#334155'], medium: ['#FEF3C7', '#92400E'], high: ['#FFEDD5', '#9A3412'], critical: ['#FEE2E2', '#991B1B'] },
};
const M = 40; // page margin
const W = 595.28 - 2 * M;

/** Re-encode logos/background so PDFKit can embed them (it mis-decodes interlaced PNGs). */
export async function prepareBrand(raw = {}) {
  const out = {};
  for (const [k, buf] of Object.entries(raw)) {
    if (!buf) continue;
    try { out[k] = k === 'bg' ? await sharp(buf).resize(1240).jpeg({ quality: 80 }).toBuffer() : await sharp(buf).png({ progressive: false }).toBuffer(); }
    catch { /* skip unreadable file */ }
  }
  return out;
}

const TOP = 78; // content top on pages 2+ (below the JESA header)

/** brand = { logo, logoSmall, url, bg } image buffers (any may be missing). */
function newDoc(brand = {}, label = '') {
  const doc = new PDFDocument({ size: 'A4', margins: { top: TOP, bottom: M + 14, left: M, right: M }, bufferPages: true, info: { Producer: 'JPH Housekeeping', Author: 'JESA' } });
  const open = (b) => { try { return b ? doc.openImage(b) : null; } catch { return null; } };
  doc._brand = { logo: open(brand.logo), logoSmall: open(brand.logoSmall), url: open(brand.url), bg: open(brand.bg) };
  doc.on('pageAdded', () => contentHeader(doc, label));
  return doc;
}
// JESA content-slide header: small logo left, thin ink rule, report label right.
function contentHeader(doc, label) {
  const b = doc._brand;
  const right = M + W;
  if (b.logoSmall) doc.image(b.logoSmall, M, 24, { width: 92 });
  else doc.font('Helvetica-Bold').fontSize(13).fillColor(C.primary).text('JESA', M, 28, { lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.text).text(label, M + 120, 30, { width: W - 120, align: 'right', lineBreak: false });
  doc.moveTo(M + 110, 52).lineTo(right - 4, 52).lineWidth(0.6).strokeColor(C.text).stroke();
  doc.circle(right - 2, 52, 1.8).fill(C.text);
  doc.x = M; doc.y = TOP;
}
function toBuffer(doc) {
  return new Promise((res) => { const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => res(Buffer.concat(chunks))); doc.end(); });
}
const ensure = (doc, h) => { if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage(); };

// Page-1 header in the JESA cover style: wave background band, large logo, navy title.
function header(doc, title, sub) {
  const b = doc._brand, bandH = 150, pw = doc.page.width;
  if (b.bg) { doc.save(); doc.rect(0, 0, pw, bandH).clip(); doc.image(b.bg, 0, -20, { width: pw }); doc.restore(); }
  else doc.rect(0, 0, pw, bandH).fill(C.muted);
  if (b.logo) doc.image(b.logo, M, 26, { width: 150 });
  else doc.font('Helvetica-Bold').fontSize(22).fillColor(C.primary).text('JESA', M, 28);
  doc.fillColor(C.primary).font('Helvetica').fontSize(20).text(title, M, 78, { width: W });
  doc.font('Helvetica').fontSize(11.5).fillColor(C.text).text(sub, M, doc.y + 3, { width: W });
  doc.x = M; doc.y = bandH + 16;
}
function h2(doc, text, need = 60) {
  ensure(doc, need);
  doc.moveDown(0.6).font('Helvetica-Bold').fontSize(13).fillColor(C.primary).text(text, M);
  const y = doc.y + 3; doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.8).strokeColor(C.border).stroke();
  doc.y = y + 8;
}
function box(doc, paragraphs, bg, fg, title) {
  const pad = 12;
  doc.font('Helvetica').fontSize(10.5);
  const heights = paragraphs.map((p) => doc.heightOfString(p, { width: W - 2 * pad }));
  const titleH = title ? 18 : 0;
  const h = titleH + heights.reduce((s, x) => s + x + 6, 0) + 2 * pad - 6;
  ensure(doc, h + 10);
  const y0 = doc.y;
  doc.roundedRect(M, y0, W, h, 8).fill(bg);
  doc.rect(M, y0 + 8, 4, h - 16).fill(fg === C.warnFg ? C.warnFg : C.blue); // JESA card side marker
  let y = y0 + pad;
  if (title) { doc.font('Helvetica-Bold').fontSize(11).fillColor(fg).text(title, M + pad, y, { width: W - 2 * pad }); y += titleH; }
  paragraphs.forEach((p, i) => {
    doc.font(i === 0 || !paragraphs.length ? 'Helvetica' : 'Helvetica-Oblique').fontSize(10.5).fillColor(i === 0 ? fg : C.text2)
      .text(p, M + pad, y, { width: W - 2 * pad, lineGap: 1 });
    y += heights[i] + 6;
  });
  doc.y = y0 + h + 10; doc.x = M;
}
function kpis(doc, items) {
  ensure(doc, 70);
  const gap = 10, w = (W - gap * (items.length - 1)) / items.length, y = doc.y;
  items.forEach(([label, value, bg], i) => {
    const x = M + i * (w + gap);
    doc.roundedRect(x, y, w, 58, 8).fillAndStroke(bg || '#FFFFFF', C.border);
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.primary).text(String(value), x + 10, y + 8, { width: w - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text2).text(label, x + 10, y + 36, { width: w - 20, height: 20, ellipsis: true });
  });
  doc.y = y + 70; doc.x = M;
}
function table(doc, cols, rows, { widths, fontSize = 9.5 } = {}) {
  const ws = widths || cols.map(() => W / cols.length);
  const pad = 5;
  const rowH = (cells, font) => Math.max(...cells.map((c, i) => { doc.font(font).fontSize(fontSize); return doc.heightOfString(String(c ?? ''), { width: ws[i] - 2 * pad }); })) + 2 * pad;
  const draw = (cells, font, fill, color) => {
    const h = rowH(cells, font);
    ensure(doc, h);
    const y = doc.y; let x = M;
    if (fill) doc.rect(M, y, W, h).fill(fill);
    cells.forEach((c, i) => { doc.font(font).fontSize(fontSize).fillColor(color).text(String(c ?? ''), x + pad, y + pad, { width: ws[i] - 2 * pad }); x += ws[i]; });
    doc.moveTo(M, y + h).lineTo(M + W, y + h).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.y = y + h; doc.x = M;
  };
  draw(cols, 'Helvetica-Bold', C.primary, '#FFFFFF');
  rows.forEach((r) => draw(r, 'Helvetica', null, C.text));
  doc.moveDown(0.5);
}
function bars(doc, rows, labelFn) {
  if (!rows.length) return;
  const max = Math.max(...rows.map((r) => r[1]));
  const labelW = 170, barW = W - labelW - 40;
  rows.forEach(([k, n]) => {
    ensure(doc, 18);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor(C.text).text(labelFn(k), M, y + 2, { width: labelW - 8, height: 12, ellipsis: true });
    doc.roundedRect(M + labelW, y + 2, Math.max(3, (n / max) * barW), 11, 3).fill(C.blue);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.text).text(String(n), M + labelW + (n / max) * barW + 6, y + 2);
    doc.y = y + 17; doc.x = M;
  });
  doc.moveDown(0.4);
}
function sevChip(doc, x, y, sevKey, text) {
  const [bg, fg] = C.sev[sevKey] || C.sev.low;
  doc.font('Helvetica-Bold').fontSize(8.5);
  const w = doc.widthOfString(text) + 12;
  doc.roundedRect(x, y, w, 14, 7).fill(bg);
  doc.fillColor(fg).text(text, x + 6, y + 3.5, { lineBreak: false });
  return w;
}
function footer(doc, left, tr) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const keep = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // writing inside the bottom margin must not create a new page
    const y = doc.page.height - M + 10;
    doc.moveTo(M, y - 8).lineTo(M + W, y - 8).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(C.text2)
      .text(left, M, y, { width: W * 0.5, lineBreak: false })
      .text(`${tr('page')} ${i + 1} / ${range.count}`, M + W * 0.4, y, { width: W * 0.2, align: 'center', lineBreak: false });
    if (doc._brand.url) doc.image(doc._brand.url, M + W - 84, y - 2, { width: 84 });
    else doc.text('jesagroup.com', M + W * 0.6, y, { width: W * 0.4, align: 'right', lineBreak: false });
    doc.page.margins.bottom = keep;
  }
}
async function photo(buf, maxPx, q) {
  return sharp(buf).rotate().resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: q }).toBuffer();
}

/** Observation cards: photo left, details right. Returns nothing; draws into doc. */
async function observationCards(doc, list, ctx, photoOpts) {
  const { tr, photos, person, fmtTime } = ctx;
  for (const [idx, o] of list.entries()) {
    const imgW = 190, imgH = 142, gap = 14, tx = M + imgW + gap, tw = W - imgW - gap;
    ensure(doc, imgH + 22);
    const y = doc.y;
    const buf = photos.get(o.temp_photo_path);
    if (buf) {
      try { doc.image(await photo(buf, photoOpts.px, photoOpts.q), M, y, { fit: [imgW, imgH], align: 'center', valign: 'center' }); }
      catch { doc.rect(M, y, imgW, imgH).fill(C.muted); }
    } else {
      doc.rect(M, y, imgW, imgH).fill(C.muted);
      doc.font('Helvetica').fontSize(9).fillColor(C.text2).text(tr('photoArchived'), M + 10, y + imgH / 2 - 10, { width: imgW - 20, align: 'center' });
    }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text).text(`${o.n ?? idx + 1}. ${o.area || tr.cat(o.category)}`, tx, y, { width: tw });
    let cy = doc.y + 4;
    let cx = tx;
    cx += sevChip(doc, cx, cy, o.severity, tr.sev(o.severity)) + 6;
    sevChip(doc, cx, cy, o.status === 'closed' ? 'low' : 'medium', o.status === 'closed' ? tr('closed') : tr('open'));
    doc.y = cy + 20;
    const kv = [
      [tr('category'), tr.cat(o.category)],
      [tr('time'), fmtTime(o.created_at)],
      [tr('supervisor'), person(o.supervisor_id)],
      [tr('coords'), o.lat != null ? `${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}${o.gps_accuracy ? ` (±${Math.round(o.gps_accuracy)} m)` : ''}` : '—'],
    ];
    if (o.ageDays != null) kv.push([tr('age'), `${o.ageDays} j/d`]);
    if (o.comment) kv.push([tr('comment'), o.comment]);
    if (o.status === 'closed' && o.closing_comment) kv.push([tr('closed'), o.closing_comment]);
    for (const [k, v] of kv) {
      doc.font('Helvetica').fontSize(9).fillColor(C.text2).text(k, tx, doc.y, { width: tw });
      doc.font('Helvetica').fontSize(10).fillColor(C.text).text(v, tx, doc.y, { width: tw });
      doc.y += 2;
    }
    if (o.drive_link) doc.font('Helvetica').fontSize(9).fillColor('#1D4ED8').text(tr('drive'), tx, doc.y, { width: tw, link: o.drive_link, underline: true });
    const afterBuf = photos.get(o.closing_temp_path);
    let bottom = Math.max(y + imgH, doc.y);
    if (afterBuf) {
      ensure(doc, 100);
      const ay = Math.max(doc.y + 4, y + imgH + 6);
      doc.font('Helvetica').fontSize(9).fillColor(C.text2).text(tr('after'), M, ay);
      try { doc.image(await photo(afterBuf, photoOpts.px, photoOpts.q), M, doc.y + 2, { fit: [120, 90] }); } catch { /* skip */ }
      bottom = Math.max(bottom, ay + 104);
    }
    doc.y = bottom + 10;
    doc.moveTo(M, doc.y).lineTo(M + W, doc.y).lineWidth(0.5).strokeColor(C.border).stroke();
    doc.y += 10; doc.x = M;
  }
}

export async function buildDailyPdf(d, ctx, photoOpts = { px: 900, q: 70 }) {
  const { tr, trs, bloc, ymdLabel, generatedLabel } = ctx;
  const doc = newDoc(ctx.brand, `${tr.only(tr.language === 'en' ? 'en' : 'fr')('daily')} · ${bloc.name} · ${ymdLabel}`);
  header(doc, `${tr('daily')}`, `JPH – Jorf Phosphate Hub · ${bloc.name} · ${ymdLabel}`);
  const summary = trs.map((t) => t.summaryDaily);
  if (d.noInput) box(doc, trs.map((t) => t('noInputSentence')), C.warnBg, C.warnFg, tr('noInputTitle'));
  box(doc, summary, C.primarySoft, C.primary, tr('summary'));
  const openNow = d.today.filter((o) => o.status === 'open').length + d.carried.length;
  kpis(doc, [
    [tr('kpiTotal'), d.today.length],
    [tr('kpiOpen'), openNow],
    [tr('kpiClosed'), d.closedToday],
    [tr('kpiHigh'), d.today.filter((o) => ['high', 'critical'].includes(o.severity)).length, d.today.some((o) => o.severity === 'critical') ? '#FEF2F2' : '#FFFFFF'],
  ]);
  if (d.today.length) {
    h2(doc, tr('byCategory')); bars(doc, d.byCategory, tr.cat);
    h2(doc, tr('bySeverity')); bars(doc, d.bySeverity, tr.sev);
  }
  if (d.mapImg) {
    h2(doc, tr('map'), W * 0.56 + 40);
    doc.image(d.mapImg, M, doc.y, { width: W }); doc.y += W * 0.56 + 8;
  }
  if (d.hotspots.length) {
    h2(doc, tr('hotspots'));
    table(doc, [tr('area'), tr('category'), '#', tr('coords')], d.hotspots.map((h) => [
      h.area || '—', h.categories.map(tr.cat).join(', '),
      tr.only(tr.language === 'en' ? 'en' : 'fr')('hotspotLine', { n: h.count, d: h.days, r: ctx.settings.hotspot_radius_m }),
      `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`]), { widths: [120, 140, 150, W - 410] });
  }
  if (d.today.length) {
    doc.addPage();
    h2(doc, tr('details'));
    await observationCards(doc, d.today, ctx, photoOpts);
  }
  h2(doc, tr('carried'));
  if (!d.carried.length) doc.font('Helvetica').fontSize(10).fillColor(C.text2).text(tr('noneCarried'));
  else await observationCards(doc, d.carried.map((o, i) => ({ ...o, n: `R${i + 1}` })), { ...ctx, fmtTime: ctx.fmtDateTime }, { px: 500, q: 60 });
  footer(doc, `${bloc.name} · ${generatedLabel}`, tr);
  return toBuffer(doc);
}

export async function buildWeeklyPdf(w, ctx) {
  const { tr, trs, bloc, periodLabel, generatedLabel, person } = ctx;
  const doc = newDoc(ctx.brand, `${tr.only(tr.language === 'en' ? 'en' : 'fr')('weekly')} · ${bloc.name} · ${periodLabel}`);
  header(doc, tr('weekly'), `JPH – Jorf Phosphate Hub · ${bloc.name} · ${periodLabel}`);
  box(doc, trs.map((t) => t.summaryWeekly), C.primarySoft, C.primary, tr('summary'));
  const st = w.stats;
  kpis(doc, [
    [tr('kpiTotal'), st.total], [tr('kpiHigh'), st.high], [tr('kpiClosed'), st.closedCount], [tr('kpiOpen'), w.openNow],
  ]);
  h2(doc, tr('trend'));
  // Simple column chart per day
  ensure(doc, 130);
  const y0 = doc.y, h = 90, max = Math.max(1, ...st.perDay.map((p) => p.n)), cw = W / st.perDay.length;
  st.perDay.forEach((p, i) => {
    const bh = (p.n / max) * h, x = M + i * cw;
    doc.roundedRect(x + cw * 0.2, y0 + h - bh, cw * 0.6, Math.max(bh, 1), 3).fill(C.blue);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text(String(p.n), x, y0 + h - bh - 12, { width: cw, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text2).text(p.day.slice(8, 10) + '/' + p.day.slice(5, 7), x, y0 + h + 4, { width: cw, align: 'center' });
  });
  doc.y = y0 + h + 22; doc.x = M;
  h2(doc, tr('byCategory')); bars(doc, st.byCategory, tr.cat);
  h2(doc, tr('bySeverity')); bars(doc, st.bySeverity, tr.sev);
  if (st.topAreas.length) { h2(doc, tr('topAreas')); bars(doc, st.topAreas, (a) => a); }
  h2(doc, tr('closeTime'));
  doc.font('Helvetica').fontSize(10.5).fillColor(C.text).text(tr.only(tr.language === 'en' ? 'en' : 'fr')('closeLine', { n: st.closedCount, m: fmtHours(st.medianCloseH), a: fmtHours(st.meanCloseH) }));
  doc.moveDown(0.5);
  h2(doc, tr('activity'));
  table(doc, [tr('supervisor'), tr('kpiTotal')], st.bySupervisor.map(([id, n]) => [person(id), n]), { widths: [W - 120, 120] });
  if (w.hotspots.length) {
    h2(doc, tr('hotspots'));
    table(doc, [tr('area'), tr('category'), '#', tr('coords')], w.hotspots.map((hs) => [
      hs.area || '—', hs.categories.map(tr.cat).join(', '), `${hs.count} / ${hs.days} j/d`, `${hs.lat.toFixed(5)}, ${hs.lng.toFixed(5)}`]),
    { widths: [140, 170, 80, W - 390] });
  }
  if (w.mapImg) { h2(doc, tr('map'), W * 0.56 + 40); doc.image(w.mapImg, M, doc.y, { width: W }); doc.y += W * 0.56 + 8; }
  if (w.openList.length) {
    h2(doc, tr('carried'));
    table(doc, [tr('date'), tr('area'), tr('category'), tr('severity'), tr('supervisor')],
      w.openList.map((o) => [ctx.fmtDateTime(o.created_at), o.area, tr.cat(o.category), tr.sev(o.severity), person(o.supervisor_id)]),
      { widths: [80, 130, 110, 80, W - 400] });
  }
  footer(doc, `${bloc.name} · ${generatedLabel}`, tr);
  return toBuffer(doc);
}
