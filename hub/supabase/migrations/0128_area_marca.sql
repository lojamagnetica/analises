-- Área "Nossa marca" (Nossa história + Guia das marcas): nasce com cadeado em todo portal, como Conteúdo.
-- É entregue na semana depois do Diagnóstico; a equipe libera em Equipe › portal › Áreas com cadeado.
set lock_timeout = '8s';
update public.portais set menu_trancado = array_append(coalesce(menu_trancado, '{}'), 'marca')
  where not ('marca' = any(coalesce(menu_trancado, '{}')));
alter table public.portais alter column menu_trancado set default '{conteudo,marca}'::text[];
