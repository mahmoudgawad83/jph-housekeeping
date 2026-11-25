# JPH Housekeeping Reporting App — Project Brief

Owner: JPH Program Director (app administrator)

## Goal
A free-hosted, mobile-friendly web app where housekeeping supervisors log observations with geotagged photos on a map, per Bloc. The app compiles each Bloc's inputs into a PDF report emailed automatically to the client every day at 19:00 (Africa/Casablanca), plus a weekly summary report.

Build and deploy it end to end: create the repo, push code, set up hosting, database, storage, scheduler and email. Ask the admin only for things he must do himself (account sign-ups, passwords, verification codes, API keys).

## Decisions already made
- Organised by Bloc: Blocs 7, 8, 9, 10 for now (admin can add more)
- Each Bloc has its own authorised supervisors and its own report recipients
- Login by username + password
- Reports: email with PDF attached, photos included in the PDF
- Photos: permanent archive in Google Drive (folder per Bloc / date); database stores the Drive link + coordinates
- App keeps a temporary photo copy for 30 days (for building PDFs), then deletes it automatically
- Look: clean, neat, minimal colour, LIGHT theme only (no dark colours). Use the ui-ux-pro-max skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill) for design rules
- Report should be "smart": short written summary at the top, repeat hotspots flagged, warning when a Bloc has no inputs by a set time

## Roles
- Admin: manages Blocs, supervisors, recipients, report times
- Supervisor: logs in, reports only to assigned Blocs
- Recipients: email only, no login

## Features
1. Login
2. Map view of the Bloc with today's observations as pins
3. New observation: phone camera photo, GPS + timestamp captured automatically; supervisor adds area, category (spillage, waste, obstruction, cleanliness OK, …), severity, comment
4. Status follow-up: open / closed, optional "after" photo
5. Daily report 19:00, one PDF per Bloc: summary, counts by category/severity, map snapshot with pins, every photo with coordinates and comment, open items carried over
6. Weekly report: trends, most common issues, time to close, supervisor activity
7. Admin page for Blocs, supervisors, recipients

## Architecture (free tier)
- Front end: GitHub Pages (PWA, installable on phone home screen)
- Database + auth: Supabase
- Temporary photo store: Supabase Storage, 30-day auto-delete
- Archive: Google Drive via service account
- Scheduler / report engine: Supabase scheduled functions or GitHub Actions
- Email: free transactional service (Resend or Brevo)

## Data model
- blocs(id, name)
- users(id, username, full_name, role)
- bloc_supervisors(bloc_id, user_id)
- bloc_recipients(bloc_id, email, name, daily bool, weekly bool)
- observations(id, bloc_id, supervisor_id, created_at, lat, lng, area, category, severity, comment, status, temp_photo_path, drive_link, closing_photo_link)
- reports(id, bloc_id, type daily|weekly, period, pdf_link, sent_at, recipients)

## Still to confirm with the admin
- Sender email address and display name
- Weekly report day and time
- Category and severity lists
- Report language: French, English or both
- Supervisor and recipient lists per Bloc
- (GitHub repo: done)

## Build notes (implementation decisions)
- Defaults in use until the admin changes them in the Admin page: sender "JPH Housekeeping"; weekly report Monday 08:00 covering the previous 7 days; reports in French + English; categories spillage, waste, obstruction, leak, dust, equipment left, cleanliness OK, other; severities low/medium/high/critical; "no input" warning at 14:00.
- Google Drive uses an OAuth refresh token (scope drive.file) instead of a service account: service accounts have no storage quota in a personal Google Drive.
- Usernames are mapped to internal addresses `<username>@jph.local` in Supabase Auth; users are created by the admin via the `admin_create_user` SQL function (no e-mail involved).
- Scheduler: GitHub Actions hourly (`.github/workflows/reports.yml`); the script checks the local time in Africa/Casablanca.
- Design system: `design-system/MASTER.md` (from the ui-ux-pro-max skill data).
- Layout: `web/` = PWA front end (GitHub Pages), `supabase/` = SQL, `jobs/` = report engine, `docs/SETUP.md` = setup guide.
- PDF reports use the JESA corporate style (navy #253C8D, blues, wave header, logos). The logo/background files live in the private Supabase bucket `branding` (jesa-logo.png, jesa-logo-small.png, jesagroup-com.png, bg-cover.jpg), not in this public repo; without them the report falls back to text "JESA".
- App interface languages: French, English, Arabic (right-to-left). Reports stay French/English. Categories and severities carry `ar` labels in `settings`.
- Admin › Export: observations for a Bloc/date range/status as Excel (.xlsx, via SheetJS from jsDelivr) or CSV (UTF-8 with BOM, `;` separated).
