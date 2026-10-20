-- Replace the single set of bank fields with a list of payment methods
-- (bank accounts, Orange Money, MyZaka, Smega). The bank columns were never used.
alter table public.profiles
  drop column if exists bank_name,
  drop column if exists bank_account_name,
  drop column if exists bank_account_number,
  drop column if exists bank_branch_code,
  drop column if exists bank_swift,
  add column if not exists payment_methods jsonb not null default '[]'::jsonb
    constraint profiles_payment_methods_is_array check (jsonb_typeof(payment_methods) = 'array' and jsonb_array_length(payment_methods) <= 6);
