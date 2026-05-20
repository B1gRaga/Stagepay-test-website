-- Ensure logos bucket exists
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Recreate logos storage policies cleanly (idempotent)
drop policy if exists "Users can upload own logo"   on storage.objects;
drop policy if exists "Users can update own logo"   on storage.objects;
drop policy if exists "Users can delete own logo"   on storage.objects;
drop policy if exists "Logos are publicly readable" on storage.objects;

create policy "logos: owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos: owner update" on storage.objects
  for update to authenticated using (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos: owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
