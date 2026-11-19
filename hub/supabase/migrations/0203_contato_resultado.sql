-- O que aconteceu em cada item do dia da CS: conversei, não foi necessário (com motivo), aguardando resposta,
-- não consegui falar, adiado, a loja resolveu, passado para a Camilla. Tudo vira histórico da loja.
-- retomar_em: até essa data o alerta fica fechado; depois, volta para a lista (aguardando, não consegui, adiado).
set lock_timeout='8s';
alter table public.cs_contatos add column if not exists resultado text not null default 'conversei';
alter table public.cs_contatos add column if not exists retomar_em date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='cs_contatos_resultado_ck') then
    alter table public.cs_contatos add constraint cs_contatos_resultado_ck check (resultado in ('conversei','nao_necessario','aguardando','nao_consegui','adiado','loja_resolveu','para_camilla'));
  end if;
end $$;
