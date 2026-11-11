-- A equipe (Camilla e Claudia) recebe aviso sempre que uma loja inclui ou altera algo no Hub.
-- Um gatilho único para as tabelas que a loja alimenta; o mesmo aviso não repete em 3 horas.
create or replace function public.novidade_unica(p_portal uuid, p_tipo text, p_texto text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from novidades where portal_id = p_portal and tipo = p_tipo and texto = left(p_texto, 300) and created_at > now() - interval '3 hours') then return; end if;
  perform novidade(p_portal, p_tipo, p_texto, p_link);
exception when others then
  raise warning 'novidade_unica: %', sqlerrm;
end $$;

create or replace function public.nov_inclusao() returns trigger language plpgsql security definer set search_path = public as $$
declare area text := tg_argv[0]; j jsonb := to_jsonb(new); loja text;
begin
  if public.is_equipe() then return new; end if;
  loja := coalesce(nullif(j->>'loja', ''), nome_da_loja((j->>'portal_id')::uuid));
  perform novidade_unica((j->>'portal_id')::uuid, 'inclusao', '🆕 ' || loja || ' incluiu algo em ' || area, '/equipe/portal?portal=' || (j->>'portal_id'));
  return new;
exception when others then
  return new; -- o aviso nunca impede a loja de salvar
end $$;

do $$ declare x record; begin
  for x in select * from (values
    ('loja_clientes','Clientes'),('cliente_anotacoes','Clientes'),('loja_vendas','Vendas'),('loja_compras','Compras'),
    ('loja_estoque','Estoque'),('loja_estoque_itens','Estoque'),('loja_crediario','Crediário'),('loja_boletos','Boletos'),
    ('loja_caixa_itens','Relatórios do caixa'),('loja_envios','Envios'),('loja_conteudo','Conteúdo'),('loja_posts','Conteúdo'),
    ('loja_marcas','Marcas'),('loja_feedbacks','Feedbacks'),('loja_treinamentos','Treinamentos'),('loja_vagas','Contratação'),
    ('loja_candidatos','Contratação'),('loja_acoes','Ações'),('loja_gincanas','Gincanas'),('loja_pdi','PDI'),('loja_otb','OTB'),
    ('loja_organograma','Organograma'),('loja_rotina','Rotina'),('loja_planner','Planner'),('loja_diagnostico','Diagnóstico'),
    ('loja_analise_perfil','Análise de perfil'),('notas','Notas'),('loja_missoes','Missões'),('loja_vez_atend','Lista da vez'),
    ('loja_relatorios_drive','Arquivos'),('loja_canais_registro','Canais'),('loja_mural','Mural'),('planeje','Planeje'),('plano_itens','Plano de ação'),
    ('loja_equipe','Pessoas do time')
  ) t(tabela, area) loop
    execute format('drop trigger if exists nov_inclusao on public.%I', x.tabela);
    execute format('create trigger nov_inclusao after insert on public.%I for each row execute function public.nov_inclusao(%L)', x.tabela, x.area);
  end loop;
end $$;
