alter table public.profiles
  add column if not exists whatsapp_reminders_enabled boolean not null default false;
