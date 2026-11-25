-- First-time setup: create the administrator login.
-- Replace the username, name and password below, then Run in Supabase → SQL Editor.
select public.admin_create_user('admin', 'Administrator', 'CHANGE-ME-strong-password', 'admin');
