# JPH Housekeeping

Mobile web app (installable on phones) for housekeeping supervisors to log observations with geotagged photos on a map, per Bloc — with automatic daily (19:00, Africa/Casablanca) and weekly PDF reports by e-mail and a permanent photo archive in Google Drive.

| Part | Where | Tech |
|---|---|---|
| App | `web/` → GitHub Pages | Vanilla JS PWA, Leaflet, Supabase JS |
| Database, login, temporary photos | `supabase/schema.sql` | Supabase (Postgres + RLS + Storage) |
| Reports, archive, clean-up | `jobs/` → GitHub Actions hourly | Node 22, PDFKit, sharp |
| E-mail | Brevo (or Resend) | |
| Archive | Google Drive (`drive.file` scope) | |
| Design rules | `design-system/MASTER.md` | from ui-ux-pro-max |

Setup: see [docs/SETUP.md](docs/SETUP.md).

Local test of the PDF layout (no accounts needed):
```bash
cd jobs && npm ci && node test/sample-report.mjs   # writes out/sample-daily.pdf and out/sample-weekly.pdf
```
