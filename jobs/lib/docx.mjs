// Word (.docx) version of the daily and weekly reports — same content as the PDF, JESA style, editable.
import {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, Header, Footer, PageNumber, HeadingLevel, VerticalAlign, ExternalHyperlink,
} from 'docx';
import sharp from 'sharp';
import { fmtHours } from './analysis.mjs';

const NAVY = '253C8D', BLUE = '0483BA', INK = '010202', GREY = '4B5563', MIST = 'E2EEEF', LINE = 'CECECE';
const SEV = { low: 'E2E8F0', medium: 'FEF3C7', high: 'FFEDD5', critical: 'FEE2E2' };
const FONT = 'Arial';
const PAGE_W = 9360; // twips of usable width (A4 with 2.5 cm margins ≈ 9638; keep a little slack)

const t = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color || INK });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 80, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 2 } }, children: [t(text, { size: 26, bold: true, color: NAVY })] });

const noBorders = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const gridBorders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };

function cell(children, o = {}) {
  return new TableCell({
    children: (Array.isArray(children) ? children : [children]).map((c) => (c instanceof Paragraph || c instanceof Table ? c : p(c, { after: 0 }))),
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 }, verticalAlign: o.valign || VerticalAlign.CENTER, borders: o.borders,
  });
}
function table(head, rows, widths) {
  const total = widths.reduce((s, w) => s + w, 0), scale = PAGE_W / total, ws = widths.map((w) => Math.round(w * scale));
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: ws, borders: gridBorders,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(t(h, { bold: true, color: 'FFFFFF', size: 18 }), { width: ws[i], fill: NAVY })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(v instanceof TextRun || v instanceof Paragraph ? v : t(v, { size: 18 }), { width: ws[i] })) })),
    ],
  });
}
function box(paragraphs, title, fill = MIST, color = NAVY) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [PAGE_W],
    borders: { top: noBorders.top, bottom: noBorders.bottom, right: noBorders.right, left: { style: BorderStyle.SINGLE, size: 24, color: BLUE }, insideHorizontal: noBorders.top, insideVertical: noBorders.top },
    rows: [new TableRow({ children: [cell([
      ...(title ? [p(t(title, { bold: true, color, size: 22 }), { after: 60 })] : []),
      ...paragraphs.map((x, i) => p(t(x, { italics: i > 0, color: i ? GREY : color, size: 20 }), { after: 60 })),
    ], { fill, width: PAGE_W })] })],
  });
}
function kpis(items) {
  const w = Math.floor(PAGE_W / items.length);
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: items.map(() => w), borders: gridBorders,
    rows: [new TableRow({ children: items.map(([label, value, warn]) => cell([
      p(t(value, { size: 36, bold: true, color: warn ? '9A3412' : NAVY }), { after: 0 }),
      p(t(label, { size: 16, color: GREY }), { after: 0 }),
    ], { width: w, fill: warn ? 'FFF7ED' : 'FFFFFF' })) })],
  });
}
async function img(buf, maxWidthPx, q = 70) {
  const meta = await sharp(buf).rotate().metadata();
  const out = await sharp(buf).rotate().resize(Math.min(1000, maxWidthPx * 2), null, { withoutEnlargement: true }).jpeg({ quality: q }).toBuffer();
  const w0 = meta.autoOrient?.width || meta.width, h0 = meta.autoOrient?.height || meta.height;
  const w = maxWidthPx, h = Math.round((h0 / w0) * w);
  return new ImageRun({ data: out, transformation: { width: w, height: h } });
}
async function logoRun(brand, width) {
  if (!brand?.logo) return t('JESA', { bold: true, size: 32, color: NAVY });
  const m = await sharp(brand.logo).metadata();
  return new ImageRun({ data: brand.logo, transformation: { width, height: Math.round((m.height / m.width) * width) } });
}
function doc(children, ctx, label) {
  return new Document({
    creator: 'JESA – JPH Housekeeping', title: label,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 1300, bottom: 1100, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [p([t(label, { size: 16, color: GREY })], { align: AlignmentType.RIGHT })] }) },
      footers: { default: new Footer({ children: [p([
        t(`${ctx.bloc.name} · ${ctx.generatedLabel}   ·   ${ctx.tr('page')} `, { size: 16, color: GREY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
        t(' / ', { size: 16, color: GREY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
        t('   ·   jesagroup.com', { size: 16, color: NAVY }),
      ], { align: AlignmentType.CENTER })] }) },
      children,
    }],
  });
}
async function titleBlock(ctx, title, sub) {
  return [
    p(await logoRun(ctx.brand, 150), { after: 160 }),
    p(t(title, { size: 36, color: NAVY }), { after: 40 }),
    p(t(sub, { size: 22 }), { after: 200 }),
  ];
}
const sevChip = (tr, k) => new TextRun({ text: ` ${tr.sev(k)} `, font: FONT, size: 16, bold: true, shading: { type: ShadingType.CLEAR, color: 'auto', fill: SEV[k] || SEV.low } });

async function observationTable(list, ctx, photoPx) {
  const { tr, photos, person, fmtTime } = ctx;
  const rows = [];
  for (const [i, o] of list.entries()) {
    const buf = photos?.get(o.temp_photo_path);
    let pic;
    try { pic = buf ? p(await img(buf, photoPx), { after: 0 }) : p(t(tr('photoArchived'), { size: 16, color: GREY }), { after: 0 }); }
    catch { pic = p(t('—'), { after: 0 }); }
    const lines = [
      p([t(`${o.n ?? i + 1}. ${o.area || tr.cat(o.category)}`, { bold: true, size: 22, color: NAVY })], { after: 60 }),
      p([sevChip(tr, o.severity), t('  '), t(o.status === 'closed' ? tr('closed') : tr('open'), { size: 16, bold: true, color: o.status === 'closed' ? '166534' : '1E40AF' })], { after: 80 }),
      p([t(`${tr('category')}: `, { color: GREY, size: 18 }), t(tr.cat(o.category), { size: 18 })], { after: 20 }),
      p([t(`${tr('time')}: `, { color: GREY, size: 18 }), t(fmtTime(o.created_at), { size: 18 })], { after: 20 }),
      p([t(`${tr('supervisor')}: `, { color: GREY, size: 18 }), t(person(o.supervisor_id), { size: 18 })], { after: 20 }),
      p([t(`${tr('coords')}: `, { color: GREY, size: 18 }), t(o.lat != null ? `${o.lat.toFixed(6)}, ${o.lng.toFixed(6)}${o.gps_accuracy ? ` (±${Math.round(o.gps_accuracy)} m)` : ''}` : '—', { size: 18 })], { after: 20 }),
      ...(o.ageDays != null ? [p([t(`${tr('age')}: `, { color: GREY, size: 18 }), t(`${o.ageDays} j/d`, { size: 18 })], { after: 20 })] : []),
      ...(o.comment ? [p([t(`${tr('comment')}: `, { color: GREY, size: 18 }), t(o.comment, { size: 18 })], { after: 20 })] : []),
      ...(o.status === 'closed' && o.closing_comment ? [p([t(`${tr('closed')}: `, { color: GREY, size: 18 }), t(o.closing_comment, { size: 18 })], { after: 20 })] : []),
      ...(o.drive_link ? [p([new ExternalHyperlink({ link: o.drive_link, children: [new TextRun({ text: tr('drive'), style: 'Hyperlink', font: FONT, size: 18 })] })], { after: 0 })] : []),
    ];
    rows.push(new TableRow({ cantSplit: true, children: [
      cell(pic, { width: 3600, valign: VerticalAlign.TOP }), cell(lines, { width: PAGE_W - 3600, valign: VerticalAlign.TOP }),
    ] }));
  }
  return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [3600, PAGE_W - 3600], borders: gridBorders, rows });
}
const countRows = (rows, labelFn) => rows.map(([k, n]) => [labelFn(k), String(n)]);

export async function buildDailyDocx(d, ctx) {
  const { tr, trs, bloc, ymdLabel } = ctx;
  const title = tr('daily');
  const children = [
    ...(await titleBlock(ctx, title, `JPH – Jorf Phosphate Hub · ${bloc.name} · ${ymdLabel}`)),
    ...(d.noInput ? [box(trs.map((x) => x('noInputSentence')), tr('noInputTitle'), 'FFF7ED', '9A3412'), p('')] : []),
    box(trs.map((x) => x.summaryDaily), tr('summary')), p(''),
    kpis([[tr('kpiTotal'), d.today.length], [tr('kpiOpen'), d.today.filter((o) => o.status === 'open').length + d.carried.length],
      [tr('kpiClosed'), d.closedToday], [tr('kpiHigh'), d.today.filter((o) => ['high', 'critical'].includes(o.severity)).length, d.today.some((o) => o.severity === 'critical')]]),
  ];
  if (d.today.length) {
    children.push(h2(tr('byCategory')), table([tr('category'), '#'], countRows(d.byCategory, tr.cat), [7, 1]));
    children.push(h2(tr('bySeverity')), table([tr('severity'), '#'], countRows(d.bySeverity, tr.sev), [7, 1]));
  }
  if (d.mapImg) children.push(h2(tr('map')), p(await img(d.mapImg, 620, 80), { align: AlignmentType.CENTER }));
  if (d.hotspots.length) {
    children.push(h2(tr('hotspots')), table([tr('area'), tr('category'), '#', tr('coords')],
      d.hotspots.map((h) => [h.area || '—', h.categories.map(tr.cat).join(', '), `${h.count} / ${h.days} j/d`, `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`]), [3, 4, 2, 3]));
  }
  if (d.today.length) children.push(h2(tr('details')), await observationTable(d.today, ctx, 220));
  children.push(h2(tr('carried')));
  if (!d.carried.length) children.push(p(t(tr('noneCarried'), { color: GREY })));
  else children.push(await observationTable(d.carried.map((o, i) => ({ ...o, n: `R${i + 1}` })), { ...ctx, fmtTime: ctx.fmtDateTime }, 160));
  return Packer.toBuffer(doc(children, ctx, `${title} · ${bloc.name} · ${ymdLabel}`));
}

export async function buildWeeklyDocx(w, ctx) {
  const { tr, trs, bloc, periodLabel, person } = ctx;
  const st = w.stats, title = tr('weekly');
  const children = [
    ...(await titleBlock(ctx, title, `JPH – Jorf Phosphate Hub · ${bloc.name} · ${periodLabel}`)),
    box(trs.map((x) => x.summaryWeekly), tr('summary')), p(''),
    kpis([[tr('kpiTotal'), st.total], [tr('kpiHigh'), st.high, st.high > 0], [tr('kpiClosed'), st.closedCount], [tr('kpiOpen'), w.openNow]]),
    h2(tr('trend')), table([tr('date'), '#'], st.perDay.map((x) => [x.day.split('-').reverse().join('/'), String(x.n)]), [7, 1]),
    h2(tr('byCategory')), table([tr('category'), '#'], countRows(st.byCategory, tr.cat), [7, 1]),
    h2(tr('bySeverity')), table([tr('severity'), '#'], countRows(st.bySeverity, tr.sev), [7, 1]),
  ];
  if (st.topAreas.length) children.push(h2(tr('topAreas')), table([tr('area'), '#'], countRows(st.topAreas, (a) => a), [7, 1]));
  children.push(h2(tr('closeTime')), p(t(`${st.closedCount} · median ${fmtHours(st.medianCloseH)} · mean ${fmtHours(st.meanCloseH)}`)));
  children.push(h2(tr('activity')), table([tr('supervisor'), tr('kpiTotal')], st.bySupervisor.map(([id, n]) => [person(id), String(n)]), [7, 2]));
  if (w.hotspots.length) children.push(h2(tr('hotspots')), table([tr('area'), tr('category'), '#', tr('coords')],
    w.hotspots.map((h) => [h.area || '—', h.categories.map(tr.cat).join(', '), `${h.count} / ${h.days} j/d`, `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`]), [3, 4, 2, 3]));
  if (w.mapImg) children.push(h2(tr('map')), p(await img(w.mapImg, 620, 80), { align: AlignmentType.CENTER }));
  if (w.openList.length) children.push(h2(tr('carried')), table([tr('date'), tr('area'), tr('category'), tr('severity'), tr('supervisor')],
    w.openList.map((o) => [ctx.fmtDateTime(o.created_at), o.area, tr.cat(o.category), tr.sev(o.severity), person(o.supervisor_id)]), [2, 3, 3, 2, 3]));
  return Packer.toBuffer(doc(children, ctx, `${title} · ${bloc.name} · ${periodLabel}`));
}
