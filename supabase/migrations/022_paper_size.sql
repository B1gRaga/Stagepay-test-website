alter table profiles
  add column if not exists paper_size text not null default 'A4'
    check (paper_size in ('A4', 'A5', 'LETTER', 'LEGAL'));
