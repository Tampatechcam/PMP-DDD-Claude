-- 20260523000006_storage.sql
-- Private 'proofs' bucket + RLS on storage.objects.
-- Path convention: proofs/{client_id}/{order_number}/{version}.pdf

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- Clients can read PDFs that live under their own client_id folder.
create policy "proofs read own client"
  on storage.objects for select
  using (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1]::uuid = public.current_client_id()
  );

-- Admin can do anything in the bucket. Clients never upload.
create policy "proofs admin all"
  on storage.objects for all
  using (bucket_id = 'proofs' and public.is_admin())
  with check (bucket_id = 'proofs' and public.is_admin());
