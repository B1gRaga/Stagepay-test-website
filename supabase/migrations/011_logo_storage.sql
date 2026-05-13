-- Create the logos storage bucket (public so URLs are accessible without auth)
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Users can upload/update their own logo (path must start with their user id)
create policy "Users can upload own logo" on storage.objects
  for insert with check (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own logo" on storage.objects
  for update using (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own logo" on storage.objects
  for delete using (
    bucket_id = 'logos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can read logos (they are displayed on public invoice pages)
create policy "Logos are publicly readable" on storage.objects
  for select using (bucket_id = 'logos');
