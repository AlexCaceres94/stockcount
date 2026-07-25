-- Storage bucket for item photos
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

create policy "item_photos_select_own"
on storage.objects for select
using (bucket_id = 'item-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "item_photos_insert_own"
on storage.objects for insert
with check (bucket_id = 'item-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "item_photos_update_own"
on storage.objects for update
using (bucket_id = 'item-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "item_photos_delete_own"
on storage.objects for delete
using (bucket_id = 'item-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "item_photos_public_read"
on storage.objects for select
using (bucket_id = 'item-photos');
