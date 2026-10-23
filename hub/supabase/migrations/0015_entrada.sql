-- Entrada da loja: vídeo de boas-vindas, áreas que destravam por etapa, a etapa de estoque
-- com relatórios do sistema e as tarefas que o Hub cria sozinho no Plano.

-- Configurações da casa que valem para todos os portais (ex.: o vídeo de boas-vindas).
create table public.hub_config (
  chave      text primary key,
  valor      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.hub_config enable row level security;
create policy hub_config_ler    on public.hub_config for select to authenticated using (true);
create policy hub_config_equipe on public.hub_config for all using (public.is_equipe()) with check (public.is_equipe());

-- Por portal: quando a loja assistiu ao vídeo e se a equipe liberou tudo mesmo sem as etapas.
create table public.portal_entrada (
  portal_id      uuid primary key references public.portais (id) on delete cascade,
  video_visto_em timestamptz,
  livre          boolean not null default false,
  updated_at     timestamptz not null default now()
);
alter table public.portal_entrada enable row level security;
create policy entrada_ler    on public.portal_entrada for select using (public.pode_ver(portal_id));
create policy entrada_equipe on public.portal_entrada for all using (public.is_equipe()) with check (public.is_equipe());

-- A loja marca o próprio vídeo como assistido (só o do próprio portal; a primeira data fica).
create function public.marcar_video_visto() returns void
language sql security definer set search_path = public as $$
  insert into public.portal_entrada (portal_id, video_visto_em)
  select public.meu_portal(), now() where public.meu_portal() is not null
  on conflict (portal_id) do update
    set video_visto_em = coalesce(portal_entrada.video_visto_em, now()), updated_at = now()
$$;
revoke execute on function public.marcar_video_visto() from public, anon;
grant execute on function public.marcar_video_visto() to authenticated;

-- Etapa 8 da Personalização: Estoque e fornecedores.
alter table public.personalizacao drop constraint personalizacao_etapa_check;
alter table public.personalizacao add constraint personalizacao_etapa_check check (etapa between 1 and 12);

-- Tarefas criadas pelo Hub no Plano.
alter table public.plano_itens add column origem text;

-- Uma tarefa por dado que a loja marcou como "ainda não tenho" (origem "etapa:<n>:<campo>").
-- Quando o dado é preenchido depois, a tarefa se marca como feita sozinha.
create function public.pendencias_da_etapa(p_portal uuid, p_etapa int, p_faltam jsonb, p_chaves text[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  k text;
begin
  if not public.pode_ver(p_portal) then
    raise exception 'sem acesso';
  end if;
  foreach k in array coalesce(p_chaves[1:60], '{}') loop
    if p_faltam ? k then
      update public.plano_itens set feito = false, feito_em = null, texto = left(p_faltam ->> k, 300)
       where portal_id = p_portal and origem = 'etapa:' || p_etapa || ':' || k;
      if not found then
        insert into public.plano_itens (portal_id, mes, ordem, texto, origem)
        values (p_portal, 1, 900, left(p_faltam ->> k, 300), 'etapa:' || p_etapa || ':' || k);
      end if;
    else
      update public.plano_itens set feito = true, feito_em = now()
       where portal_id = p_portal and origem = 'etapa:' || p_etapa || ':' || k and not feito;
    end if;
  end loop;
end;
$$;
revoke execute on function public.pendencias_da_etapa(uuid, int, jsonb, text[]) from public, anon;
grant execute on function public.pendencias_da_etapa(uuid, int, jsonb, text[]) to authenticated;

-- Relatórios do sistema da loja: arquivos privados em relatorios/<portal_id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('relatorios', 'relatorios', false, 26214400)
on conflict (id) do nothing;

create function public.portal_do_arquivo(nome text) returns uuid
language plpgsql immutable set search_path = public as $$
begin
  return split_part(nome, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

create policy relatorios_ler on storage.objects for select to authenticated
  using (bucket_id = 'relatorios' and public.pode_ver(public.portal_do_arquivo(name)));
create policy relatorios_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'relatorios' and public.pode_ver(public.portal_do_arquivo(name)));
create policy relatorios_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'relatorios' and public.pode_ver(public.portal_do_arquivo(name)));
