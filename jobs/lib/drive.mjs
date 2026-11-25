// Google Drive archive using an OAuth refresh token (scope: drive.file).
// Files are stored in the admin's own Drive, under "JPH Housekeeping/<Bloc>/<YYYY-MM-DD>/".
// (Service accounts cannot own files in a personal Google Drive — they have no storage quota —
//  so the refresh-token method is used instead.)

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, DRIVE_ROOT_FOLDER_ID } = process.env;
export const driveEnabled = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);

let accessToken = null;
const folderCache = new Map();

async function token() {
  if (accessToken) return accessToken;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google token error: ${j.error_description || j.error}`);
  accessToken = j.access_token;
  return accessToken;
}

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${await token()}`, ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Drive error ${r.status}: ${j.error?.message || ''}`);
  return j;
}

async function folder(name, parent) {
  const key = `${parent || 'root'}/${name}`;
  if (folderCache.has(key)) return folderCache.get(key);
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parent || 'root'}' in parents`;
  const found = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  let id = found.files?.[0]?.id;
  if (!id) {
    const made = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
    });
    id = made.id;
  }
  folderCache.set(key, id);
  return id;
}

/** Ensure path like ["Bloc 7", "2026-11-25"] exists under the root folder; returns folder id. */
export async function folderPath(parts) {
  let parent = DRIVE_ROOT_FOLDER_ID || (await folder('JPH Housekeeping', null));
  for (const p of parts) parent = await folder(p, parent);
  return parent;
}

export async function upload(buffer, name, mimeType, parentId, description = '') {
  const boundary = 'jph' + Math.random().toString(16).slice(2);
  const meta = JSON.stringify({ name, parents: [parentId], ...(description ? { description } : {}) });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const j = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
  });
  return j.webViewLink || `https://drive.google.com/file/d/${j.id}/view`;
}
