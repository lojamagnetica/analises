-- Envios da loja: a pessoa do acesso "só caixa" (em geral o ADM) manda o caixa do dia, os relatórios da semana e do mês,
-- confere os números e atualiza o mural. Ela continua sem ver as outras áreas do portal.
set lock_timeout = '8s';

-- Quantas clientes novas a loja cadastrou no dia (a Camilla acompanha se o cadastro está sendo feito direito).
alter table public.loja_caixa add column if not exists cadastros integer;

-- Conferência: "os números que mandei batem com o sistema". Semanal: periodo = segunda-feira da semana (AAAA-MM-DD). Mensal: AAAA-MM.
create table if not exists public.loja_envios (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais (id) on delete cascade,
  tipo text not null check (tipo in ('semanal', 'mensal')),
  periodo text not null,
  conferido_em timestamptz not null default now(),
  por uuid default auth.uid(),
  por_nome text,
  obs text,
  unique (portal_id, tipo, periodo)
);
alter table public.loja_envios enable row level security;
drop policy if exists loja_envios_loja on public.loja_envios;
create policy loja_envios_loja on public.loja_envios for all using (public.pode_caixa(portal_id)) with check (public.pode_caixa(portal_id));

-- Relatórios da semana e do mês (pasta <portal>/gestao/...): o acesso só caixa sobe e vê só esses.
drop policy if exists relatorios_envio_ler on storage.objects;
create policy relatorios_envio_ler on storage.objects for select to authenticated
  using (bucket_id = 'relatorios' and split_part(name, '/', 2) = 'gestao' and public.pode_caixa(public.portal_do_arquivo(name)));
drop policy if exists relatorios_envio_subir on storage.objects;
create policy relatorios_envio_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'relatorios' and split_part(name, '/', 2) = 'gestao' and public.pode_caixa(public.portal_do_arquivo(name)));
drop policy if exists relatorios_envio_apagar on storage.objects;
create policy relatorios_envio_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'relatorios' and split_part(name, '/', 2) = 'gestao' and public.pode_caixa(public.portal_do_arquivo(name)));

-- Fale com a Camilla e mural para o acesso só caixa.
drop policy if exists solicitacoes_ler_caixa on public.solicitacoes;
create policy solicitacoes_ler_caixa on public.solicitacoes for select using (public.pode_caixa(portal_id));
drop policy if exists solicitacoes_enviar_caixa on public.solicitacoes;
create policy solicitacoes_enviar_caixa on public.solicitacoes for insert
  with check (public.pode_caixa(portal_id) and autor = auth.uid() and status = 'Recebida' and responsavel is null and vinculo is null);
drop policy if exists respostas_ler_caixa on public.solicitacao_respostas;
create policy respostas_ler_caixa on public.solicitacao_respostas for select using (public.pode_caixa(portal_id));
drop policy if exists respostas_enviar_caixa on public.solicitacao_respostas;
create policy respostas_enviar_caixa on public.solicitacao_respostas for insert
  with check (public.pode_caixa(portal_id) and autor = auth.uid() and equipe = public.is_equipe()
              and exists (select 1 from public.solicitacoes s where s.id = solicitacao_id and s.portal_id = solicitacao_respostas.portal_id));
drop policy if exists audios_ler_caixa on storage.objects;
create policy audios_ler_caixa on storage.objects for select to authenticated
  using (bucket_id = 'audios' and public.pode_caixa(public.portal_do_arquivo(name)));
drop policy if exists audios_subir_caixa on storage.objects;
create policy audios_subir_caixa on storage.objects for insert to authenticated
  with check (bucket_id = 'audios' and public.pode_caixa(public.portal_do_arquivo(name)));
drop policy if exists loja_mural_caixa on public.loja_mural;
create policy loja_mural_caixa on public.loja_mural for all using (public.pode_caixa(portal_id)) with check (public.pode_caixa(portal_id));

-- Boletos do mês e a rotina (Meu dia) também ficam para o acesso só caixa.
drop policy if exists rotina_caixa on public.loja_rotina;
create policy rotina_caixa on public.loja_rotina for all using (public.pode_caixa(portal_id)) with check (public.pode_caixa(portal_id));

drop policy if exists boletos_mes_caixa on public.loja_boletos_mes;
create policy boletos_mes_caixa on public.loja_boletos_mes for all using (public.pode_caixa(portal_id)) with check (public.pode_caixa(portal_id));
grant select, insert, update, delete on public.loja_envios to authenticated;
