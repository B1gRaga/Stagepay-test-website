-- Waitlist reworked for market validation before launch.
-- The table was first made for tutors only (business_type / student_range);
-- it now takes every business type the app supports and records how people
-- invoice today, whether the Pro price is acceptable, their town, and who
-- referred them. The table had no rows when this ran.

alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_business_type_check,
  drop constraint if exists waitlist_signups_student_range_check,
  drop column if exists student_range;

alter table public.waitlist_signups
  add column if not exists town text,
  add column if not exists current_method text,
  add column if not exists would_pay text,
  add column if not exists referral_code text not null
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  add column if not exists referred_by text;

-- Values match lib/business-types.ts and lib/waitlist.ts.
alter table public.waitlist_signups
  add constraint waitlist_signups_business_type_check
    check (business_type in ('tuition_centre','contractor','freelancer','salon','agency','other')),
  add constraint waitlist_signups_town_check
    check (town is null or char_length(town) <= 40),
  add constraint waitlist_signups_current_method_check
    check (current_method is null or current_method in ('paper','word_excel','whatsapp_text','software','none')),
  add constraint waitlist_signups_would_pay_check
    check (would_pay is null or would_pay in ('yes','cheaper','unsure','no')),
  add constraint waitlist_signups_referral_code_key unique (referral_code),
  add constraint waitlist_signups_referred_by_check
    check (referred_by is null or referred_by ~ '^[a-f0-9]{8}$');

create index if not exists waitlist_signups_referred_by_idx
  on public.waitlist_signups (referred_by) where referred_by is not null;
