-- Backup hourly trigger for the report engine.
-- GitHub's own schedule can be delayed or skipped; this asks GitHub to run the
-- "Reports & housekeeping jobs" workflow every hour at :12 from inside Supabase.
-- The job is idempotent (it checks what was already sent), so extra runs are harmless.
--
-- BEFORE RUNNING: replace PASTE-YOUR-GITHUB-TOKEN-HERE below with your GitHub token
-- (fine-grained, only this repository, permission "Actions: Read and write").
-- Run it once in Supabase -> SQL Editor. Do not save the token anywhere else.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Store the token encrypted in Supabase Vault (replaces an older one with the same name).
delete from vault.secrets where name = 'github_dispatch_token';
select vault.create_secret('PASTE-YOUR-GITHUB-TOKEN-HERE', 'github_dispatch_token', 'Starts the JPH report workflow');

-- Every hour at minute 12.
select cron.unschedule('jph-reports-hourly') where exists (select 1 from cron.job where jobname = 'jph-reports-hourly');
select cron.schedule('jph-reports-hourly', '12 * * * *', $$
  select net.http_post(
    url := 'https://api.github.com/repos/mahmoudgawad83/jph-housekeeping/actions/workflows/reports.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'github_dispatch_token'),
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'jph-housekeeping-cron'),
    body := '{"ref":"main","inputs":{"force":"normal"}}'::jsonb
  );
$$);

-- Check: the job is listed, and (after the next :12) GitHub answered 204.
select jobname, schedule, active from cron.job where jobname = 'jph-reports-hourly';
-- select status_code, created from net._http_response order by created desc limit 5;
