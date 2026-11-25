# Setup guide

All services below are free. Each step says **who** does it.

## 1. Supabase: database, login and photo storage (admin, ~10 min)
1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub or Google.
2. **New project** → name `jph-housekeeping`, choose a strong database password (keep it safe), region **Europe (e.g. Paris / Frankfurt)** → Create.
3. When it is ready: **SQL Editor → New query**, paste the whole content of [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
4. New query again, paste [`supabase/create-admin.sql`](../supabase/create-admin.sql), **change the username, name and password** in it → **Run**. This is your admin login.
5. **Project Settings → API**: you will need
   - the **Project URL** (public)
   - the **anon / publishable key** (public, safe to share)
   - the **service_role / secret key** (SECRET — only goes into GitHub secrets, step 4)

## 2. E-mail: Brevo (admin, ~5 min)
1. Sign up at <https://www.brevo.com> (free: 300 e-mails/day).
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: the address reports come from (e.g. your work address) and confirm the verification e-mail.
3. **SMTP & API → API keys → Generate a new API key** (keep it secret, step 4).

(Alternative: Resend — set the repository variable `EMAIL_PROVIDER` to `resend`; Resend requires your own domain.)

## 3. Google Drive archive (admin, ~10 min)
1. Open <https://console.cloud.google.com> with the Google account whose Drive will hold the archive → create a project `jph-housekeeping`.
2. **APIs & Services → Library → Google Drive API → Enable**.
3. **APIs & Services → OAuth consent screen**: External, app name `JPH Housekeeping`, your e-mail; add yourself as a **test user**; then **Publish app** (so the token does not expire after 7 days — no review is needed for the `drive.file` scope).
4. **Credentials → Create credentials → OAuth client ID** → type **Web application**, add authorised redirect URI `https://developers.google.com/oauthplayground` → note the **client ID** and **client secret**.
5. Open <https://developers.google.com/oauthplayground> → gear icon → tick **Use your own OAuth credentials** → paste client ID and secret.
   In "Input your own scopes" type `https://www.googleapis.com/auth/drive.file` → **Authorize APIs** → sign in → **Exchange authorization code for tokens** → copy the **Refresh token**.

Photos will appear in Drive under **JPH Housekeeping / Bloc 7 / 2026-11-25 / …**, PDFs under **JPH Housekeeping / Bloc 7 / Reports**.

## 4. GitHub settings (admin, ~5 min)
Repository → **Settings → Secrets and variables → Actions**.

**Secrets** (New repository secret):
| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `EMAIL_API_KEY` | Brevo API key |
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `GOOGLE_REFRESH_TOKEN` | from step 3 |

**Variables** (Variables tab):
| Name | Value |
|---|---|
| `EMAIL_FROM` | the verified sender address |
| `EMAIL_PROVIDER` | `brevo` (default) or `resend` |

Then **Settings → Pages → Source: GitHub Actions**.

## 5. Connect the app to Supabase (Claude does this)
`web/config.js` gets the Project URL and publishable key; pushing to `main` publishes the app at
`https://<github-user>.github.io/jph-housekeeping/`.

## 6. First use
1. Open the app link on your phone, sign in with the admin login.
2. **Admin → Blocs**: for each Bloc, move the map over the Bloc and tap **Use current map view as Bloc centre**.
3. **Admin → Users**: create supervisor logins and tick their Blocs.
4. **Admin → Recipients**: add report recipients per Bloc.
5. **Admin → Settings**: check times, language, categories, and the "no input" warning recipients.
6. Install on the phone: Android Chrome → menu → **Install app**; iPhone Safari → Share → **Add to Home Screen**.

## Testing a report
GitHub → **Actions → Reports & housekeeping jobs → Run workflow** → choose `daily`, optionally a Bloc, tick **dry run** to only build the PDF (download it from the run page), or untick it to really send.

## Good to know
- Free Supabase projects pause after 7 days without activity; the hourly job keeps it awake.
- GitHub pauses scheduled workflows in a repository with no commits for 60 days; GitHub e-mails a warning — click "Enable" or push any change.
- GitHub's hourly schedule can run a few minutes late; the 19:00 report normally arrives between 19:05 and 19:30.
- Temporary photos are deleted 30 days after the observation, but only once they are safely archived in Drive.
