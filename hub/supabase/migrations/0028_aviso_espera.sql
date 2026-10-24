-- Aviso automático do Fale com a Camilla: se a loja ficou mais de 24 h sem resposta, a Assistente Magnética
-- manda um recado. Três modelos em sequência (hub_config 'avisos_espera'), para a loja não receber o mesmo seguido.
alter table public.solicitacao_respostas add column if not exists automatica boolean not null default false;

-- O recado automático não conta como resposta: a mensagem continua em aberto para a equipe.
create or replace function public.status_pela_resposta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.automatica then return new; end if;
  update public.solicitacoes
     set status = case when new.equipe then 'Respondida' else 'Recebida' end, updated_at = now()
   where id = new.solicitacao_id and status <> 'Concluída';
  return new;
end;
$$;

insert into public.hub_config (chave, valor) values ('avisos_espera', jsonb_build_array(
  'Oie, tudo bem? Passando para te avisar que a Camilla não esqueceu de você! Esses dias estão com mensagens acima da média, mas a sua já está entre as próximas a ter retorno.',
  'Oi! Sua mensagem está aqui com a gente, viu? A Camilla está respondendo cada loja com calma e atenção, e a sua já está na fila de hoje. Logo, logo ela te responde.',
  'Oie! Só para você não ficar sem notícia: sua mensagem não se perdeu. A Camilla está fechando as respostas mais antigas e a sua vem em seguida. Obrigada pela paciência!'
)) on conflict (chave) do nothing;

-- Roda de hora em hora, das 8h às 20h (Recife). No máximo um recado a cada 24 h de espera e 3 por mensagem.
-- O modelo segue a sequência da loja (conta os recados que ela já recebeu), então nunca repete o anterior.
create or replace function public.avisar_espera() returns integer
language plpgsql security definer set search_path = public as $$
declare
  modelos jsonb := (select valor from hub_config where chave = 'avisos_espera');
  n int := coalesce(jsonb_array_length(modelos), 0);
  r record; feitos int := 0;
begin
  if n = 0 or extract(hour from now() at time zone 'America/Recife') not between 8 and 19 then return 0; end if;
  for r in
    select s.id, s.portal_id,
           greatest(s.created_at, coalesce((select max(x.created_at) from solicitacao_respostas x where x.solicitacao_id = s.id and not x.equipe), s.created_at)) as espera
      from solicitacoes s
     where s.status in ('Recebida', 'Em andamento')
  loop
    continue when r.espera > now() - interval '24 hours';
    -- Já houve resposta de verdade depois da última mensagem da loja?
    continue when exists (select 1 from solicitacao_respostas x where x.solicitacao_id = r.id and x.equipe and not x.automatica and x.created_at > r.espera);
    -- Recados desta espera: no máximo 3, e um a cada 24 h.
    continue when (select count(*) from solicitacao_respostas x where x.solicitacao_id = r.id and x.automatica and x.created_at > r.espera) >= 3;
    continue when exists (select 1 from solicitacao_respostas x where x.solicitacao_id = r.id and x.automatica and x.created_at > now() - interval '24 hours');
    insert into solicitacao_respostas (solicitacao_id, portal_id, autor, autor_nome, equipe, automatica, texto)
    values (r.id, r.portal_id, null, 'Assistente Magnética', true, true,
            modelos ->> ((select count(*) from solicitacao_respostas x where x.portal_id = r.portal_id and x.automatica)::int % n));
    feitos := feitos + 1;
  end loop;
  return feitos;
end;
$$;
revoke execute on function public.avisar_espera() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('avisar-espera', '7 * * * *', 'select public.avisar_espera()');
