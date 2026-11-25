// Test helper: serves generated tiles instead of the real tile servers (used only when testing offline).
import sharp from 'sharp';
const real = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (/arcgisonline|openstreetmap/.test(String(url))) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#D9E3C8"/><path d="M0 128H256M128 0V256" stroke="#B8C4A6" stroke-width="6"/><rect x="40" y="40" width="60" height="40" fill="#C9C1B0"/></svg>`;
    return new Response(await sharp(Buffer.from(svg)).png().toBuffer(), { status: 200 });
  }
  return real(url, opts);
};
