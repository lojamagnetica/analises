-- A loja (e a equipe) pode apagar um relatório que subiu por engano.
create policy relatorios_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'relatorios' and public.pode_ver(public.portal_do_arquivo(name)));
