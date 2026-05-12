-- Invoice theme preferences stored on the user profile
alter table profiles
  add column if not exists invoice_theme       text         default 'dark-modern',
  add column if not exists brand_color_primary varchar(7),
  add column if not exists brand_color_header  varchar(7);
