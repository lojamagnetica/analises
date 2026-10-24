-- Assistente Magnética: o canal da loja com a equipe (texto ou áudio), com tipo, status e quem cuida.
-- Substitui a tabela duvidas (as dúvidas antigas foram copiadas para cá).
create table public.solicitacoes (
  id               uuid primary key default gen_random_uuid(),
  portal_id        uuid not null references public.portais (id) on delete cascade,
  autor            uuid references auth.users (id) on delete set null,
  autor_nome       text,
  tipo             text not null default 'Dúvida' check (tipo in ('Dúvida', 'Pedido', 'Aviso', 'Urgente')),
  texto            text not null default '',
  audio            text,
  transcricao      text,
  status           text not null default 'Recebida' check (status in ('Recebida', 'Em andamento', 'Respondida', 'Concluída')),
  responsavel      uuid references auth.users (id) on delete set null,
  responsavel_nome text,
  vinculo          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.solicitacoes (portal_id, created_at desc);
create index on public.solicitacoes (status, created_at);
create table public.solicitacao_respostas (
  id             uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes (id) on delete cascade,
  portal_id      uuid not null references public.portais (id) on delete cascade,
  autor          uuid references auth.users (id) on delete set null,
  autor_nome     text,
  equipe         boolean not null default false,
  texto          text not null default '',
  audio          text,
  transcricao    text,
  created_at     timestamptz not null default now()
);
create index on public.solicitacao_respostas (solicitacao_id, created_at);
alter table public.solicitacoes enable row level security;
alter table public.solicitacao_respostas enable row level security;
create policy solicitacoes_ler    on public.solicitacoes for select using (public.pode_ver(portal_id));
create policy solicitacoes_enviar on public.solicitacoes for insert
  with check (public.pode_ver(portal_id) and autor = auth.uid() and status = 'Recebida' and responsavel is null and vinculo is null);
create policy solicitacoes_equipe on public.solicitacoes for all using (public.is_equipe()) with check (public.is_equipe());
create policy respostas_ler    on public.solicitacao_respostas for select using (public.pode_ver(portal_id));
create policy respostas_enviar on public.solicitacao_respostas for insert
  with check (public.pode_ver(portal_id) and autor = auth.uid() and equipe = public.is_equipe()
              and exists (select 1 from public.solicitacoes s where s.id = solicitacao_id and s.portal_id = solicitacao_respostas.portal_id));
create policy respostas_equipe on public.solicitacao_respostas for all using (public.is_equipe()) with check (public.is_equipe());

-- Resposta da equipe deixa a mensagem "Respondida"; nova mensagem da loja volta para "Recebida".
create function public.status_pela_resposta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.solicitacoes
     set status = case when new.equipe then 'Respondida' else 'Recebida' end, updated_at = now()
   where id = new.solicitacao_id and status <> 'Concluída';
  return new;
end;
$$;
revoke execute on function public.status_pela_resposta() from public, anon, authenticated;
create trigger resposta_atualiza_status after insert on public.solicitacao_respostas
  for each row execute function public.status_pela_resposta();

-- Áudios: arquivos privados em audios/<portal_id>/...
insert into storage.buckets (id, name, public, file_size_limit) values ('audios', 'audios', false, 26214400) on conflict (id) do nothing;
create policy audios_ler on storage.objects for select to authenticated
  using (bucket_id = 'audios' and public.pode_ver(public.portal_do_arquivo(name)));
create policy audios_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'audios' and public.pode_ver(public.portal_do_arquivo(name)));
