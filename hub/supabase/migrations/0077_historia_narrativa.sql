-- Storytelling da história da loja: a lojista conta do jeito dela; o agente (ou a equipe) monta a versão
-- para a equipe e a cultura, sem alterar os fatos, na linguagem da cliente. Fica como rascunho até a Camilla aprovar.
-- narrativa = { titulo, assinatura, capitulos: [{ titulo, texto }], esperamos, pendencias: [] }
alter table public.loja_historia add column if not exists narrativa jsonb;
alter table public.loja_historia add column if not exists narrativa_aprovada boolean not null default false;

-- O estudo do onboarding leva a versão aprovada junto (a pessoa nova lê o storytelling, não as respostas soltas).
create or replace function public.estudo_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pessoa', e.nome, 'loja', p.loja,
    'historia', (select jsonb_build_object('loja', h.loja, 'respostas', h.respostas,
        'narrativa', case when h.narrativa_aprovada then h.narrativa end, 'narrativa_aprovada', h.narrativa_aprovada)
      from loja_historia h where h.portal_id = o.portal_id and h.liberado order by h.updated_at desc limit 1),
    'marcas', coalesce((select jsonb_agg(to_jsonb(m) - 'portal_id' - 'created_at' - 'updated_at' order by m.created_at) from loja_marcas m where m.portal_id = o.portal_id), '[]'::jsonb))
  from loja_onboarding o join loja_equipe e on e.id = o.pessoa_id join portais p on p.id = o.portal_id
  where o.estudo_token = p_token;
$$;
