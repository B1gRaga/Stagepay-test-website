-- Bank details printed on invoices, and the default payment terms for new invoices.
alter table public.profiles
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_code text,
  add column if not exists bank_swift text,
  add column if not exists default_due_days integer not null default 30
    constraint profiles_default_due_days_range check (default_due_days between 0 and 365);
