-- Cria o bucket se não existir (idempotente)
insert into storage.buckets (id, name, public)
values ('water-logs-photos', 'water-logs-photos', true)
on conflict (id) do nothing;

-- Leitura pública de todos os objetos
create policy "storage: public read"
  on storage.objects for select
  using (bucket_id = 'water-logs-photos');

-- Upload: usuário só pode criar objetos dentro do seu próprio prefixo (userId/*)
create policy "storage: insert own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'water-logs-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Atualização: usuário só pode sobrescrever objetos seus
create policy "storage: update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'water-logs-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deleção: usuário só pode apagar objetos seus
create policy "storage: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'water-logs-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
