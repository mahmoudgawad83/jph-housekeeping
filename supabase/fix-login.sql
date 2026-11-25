-- Fix for logins created before 25 Nov 2026: Supabase Auth needs these fields to be
-- empty text, not missing (NULL), otherwise sign-in fails with a database error.
-- Run once in Supabase → SQL Editor. Safe to run again.
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email like '%@jph.local';

select p.username, p.role, u.email, u.email_confirmed_at is not null as confirmed
from public.profiles p join auth.users u on u.id = p.id;
