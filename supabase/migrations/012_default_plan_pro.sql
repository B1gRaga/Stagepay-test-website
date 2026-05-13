-- Change default plan to 'pro' for real-world testing
-- All new signups will be pro; all existing users are upgraded to pro

alter table public.profiles
  alter column plan set default 'pro';

-- Backfill every existing user to pro
update public.profiles set plan = 'pro';

-- Update the signup trigger so it inserts with plan = 'pro' explicitly
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'pro'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
