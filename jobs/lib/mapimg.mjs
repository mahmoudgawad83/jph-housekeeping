// Static map snapshot: stitches satellite tiles and draws numbered pins (no external map service needed).
import sharp from 'sharp';

const TILE = 256;
const SOURCES = [
  (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
];
const UA = 'JPH-Housekeeping-Reports/1.0 (internal report generator)';
const PIN = { low: '#CBD5E1', medium: '#FCD34D', high: '#FB923C', critical: '#F87171', closed: '#A7F3D0' };

const project = (lat, lng, z) => {
  const s = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
};

async function fetchTile(z, x, y) {
  for (const src of SOURCES) {
    try {
      const r = await fetch(src(z, x, y), { headers: { 'User-Agent': UA } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch { /* try next source */ }
  }
  return null;
}

/**
 * @param points [{lat,lng,label,severity,status}]
 * @param fallback {lat,lng,zoom} used when there are no points
 */
export async function mapSnapshot(points, fallback, width = 1000, height = 560) {
  const pts = points.filter((p) => p.lat != null && p.lng != null);
  let z = fallback.zoom || 16, cx, cy;
  if (pts.length) {
    const pad = 70;
    for (z = 19; z >= 3; z--) {
      const xs = pts.map((p) => project(p.lat, p.lng, z).x), ys = pts.map((p) => project(p.lat, p.lng, z).y);
      if (Math.max(...xs) - Math.min(...xs) <= width - 2 * pad && Math.max(...ys) - Math.min(...ys) <= height - 2 * pad) {
        cx = (Math.max(...xs) + Math.min(...xs)) / 2; cy = (Math.max(...ys) + Math.min(...ys)) / 2; break;
      }
    }
    z = Math.min(z, 18);
    const xs = pts.map((p) => project(p.lat, p.lng, z).x), ys = pts.map((p) => project(p.lat, p.lng, z).y);
    cx = (Math.max(...xs) + Math.min(...xs)) / 2; cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  } else {
    ({ x: cx, y: cy } = project(fallback.lat, fallback.lng, z));
  }
  const left = cx - width / 2, top = cy - height / 2;
  const tx0 = Math.floor(left / TILE), ty0 = Math.floor(top / TILE);
  const tx1 = Math.floor((left + width) / TILE), ty1 = Math.floor((top + height) / TILE);
  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1;

  const jobs = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push({ tx, ty });
  const tiles = await Promise.all(jobs.map(async (j) => ({ ...j, buf: await fetchTile(z, j.tx, j.ty) })));
  const got = tiles.filter((t) => t.buf);
  if (!got.length) return null;

  const composites = await Promise.all(got.map(async (t) => ({
    input: await sharp(t.buf).resize(TILE, TILE).png().toBuffer(), left: (t.tx - tx0) * TILE, top: (t.ty - ty0) * TILE,
  })));
  const big = await sharp({ create: { width: cols * TILE, height: rows * TILE, channels: 3, background: '#E2E8F0' } })
    .composite(composites).png().toBuffer();
  const ox = Math.round(left - tx0 * TILE), oy = Math.round(top - ty0 * TILE);
  const base = await sharp(big).extract({ left: ox, top: oy, width, height }).png().toBuffer();

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const pinsSvg = pts.map((p) => {
    const { x, y } = project(p.lat, p.lng, z);
    const px = x - left, py = y - top;
    const fill = p.status === 'closed' ? PIN.closed : PIN[p.severity] || PIN.low;
    return `<g transform="translate(${px.toFixed(1)},${py.toFixed(1)})">
      <path d="M0 0 C -4 -8 -13 -12 -13 -22 A 13 13 0 1 1 13 -22 C 13 -12 4 -8 0 0 Z" fill="${fill}" stroke="#fff" stroke-width="2.5"/>
      <text x="0" y="-17" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#1E293B">${esc(p.label)}</text></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${pinsSvg}
    <rect x="${width - 190}" y="${height - 20}" width="190" height="20" fill="#fff" fill-opacity=".8"/>
    <text x="${width - 6}" y="${height - 6}" text-anchor="end" font-family="Helvetica, Arial" font-size="11" fill="#334155">Imagery © Esri · © OpenStreetMap</text></svg>`;
  return sharp(base).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).jpeg({ quality: 82 }).toBuffer();
}
