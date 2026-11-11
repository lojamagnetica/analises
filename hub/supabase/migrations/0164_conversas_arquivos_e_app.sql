-- Conversas da equipe: anexos (fotos, PDFs, planilhas) guardados num bucket privado, só da Camilla e da CS.
set lock_timeout = '8s';
alter table public.equipe_conversas add column if not exists arquivos jsonb not null default '[]'::jsonb;  -- [{caminho, nome, tipo, tamanho}]
insert into storage.buckets (id, name, public, file_size_limit) values ('equipe-conversas', 'equipe-conversas', false, 26214400) on conflict (id) do nothing;
drop policy if exists "equipe_conversas_arquivos_ler" on storage.objects;
create policy "equipe_conversas_arquivos_ler" on storage.objects for select using (bucket_id = 'equipe-conversas' and public.pode_conversas());
drop policy if exists "equipe_conversas_arquivos_subir" on storage.objects;
create policy "equipe_conversas_arquivos_subir" on storage.objects for insert with check (bucket_id = 'equipe-conversas' and public.pode_conversas());
drop policy if exists "equipe_conversas_arquivos_apagar" on storage.objects;
create policy "equipe_conversas_arquivos_apagar" on storage.objects for delete using (bucket_id = 'equipe-conversas' and public.pode_conversas());
