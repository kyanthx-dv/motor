-- Motor · etapa 4: bucket publico "midia" (fotos/videos de posts). Leitura publica por URL; envio/apagar so na propria pasta (<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "midia: enviar na propria pasta" on storage.objects;
create policy "midia: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'midia' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "midia: apagar da propria pasta" on storage.objects;
create policy "midia: apagar da propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'midia' and (storage.foldername(name))[1] = (select auth.uid())::text);
