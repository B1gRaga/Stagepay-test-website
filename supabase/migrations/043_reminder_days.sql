-- Reminders now start by themselves when an invoice is sent, on the days the
-- person chose on the Reminders page. The choice used to live in the browser;
-- keeping it on the profile makes it follow them to every device and lets the
-- server use it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_days SMALLINT[] NOT NULL DEFAULT '{3,7,14}'
    CHECK (reminder_days <@ ARRAY[3,7,14,30]::smallint[]);

GRANT UPDATE (reminder_days) ON public.profiles TO authenticated;
