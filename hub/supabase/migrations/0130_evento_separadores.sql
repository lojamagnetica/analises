-- Agenda → reuniões da loja: o nome da loja antes de " - ", " | " ou " – " no título do evento
-- (antes só " - "; "A&C Tendência | Diagnóstico" não entrava no portal). Lembretes da CS ("faltam X dias", "lembrete") não viram reunião.
set lock_timeout = '8s';
create or replace function public.portal_do_evento(titulo text) returns uuid
language sql stable security definer set search_path = public as $$
  with p as (
    select public.sem_acento_mai(trim((regexp_split_to_array(titulo, '\s+[-|–]\s+'))[1])) as nome
    where coalesce(titulo, '') ~ '\s[-|–]\s' and coalesce(titulo, '') !~* '(faltam \d+ dias|lembrete)'
  ),
  achados as (
    select distinct x.id from portais x, p
    where x.ativo and length(p.nome) >= 3 and (
      public.sem_acento_mai(x.loja) = p.nome
      or public.sem_acento_mai(x.loja) like p.nome || ' %'
      or exists (select 1 from unnest(coalesce(x.apelidos, '{}')) a where public.sem_acento_mai(a) = p.nome))
  )
  select case when (select count(*) from achados) = 1 then (select id from achados) end
$$;
