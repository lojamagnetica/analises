-- Reuniões gravadas: o resumo vem primeiro para a Camilla, e só ela libera o que vira acompanhamento da Claudia.
-- 1. Só quem aprova (perfis.aprova) muda a reunião para aprovada ou descartada. Agente e sessão automática só deixam rascunho.
-- 2. Reunião nova para revisar: aviso no celular só da Camilla.
-- 3. Camilla aprovou com itens para a Claudia: aviso no celular só da Claudia (a CS).
set lock_timeout = '8s';

create or replace function public.gravada_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('aprovada', 'descartada') and new.status is distinct from old.status
     and not exists (select 1 from public.perfis where id = auth.uid() and aprova) then
    raise exception 'Só a Camilla aprova ou descarta a reunião, pela tela Reuniões para revisar.';
  end if;
  return new;
end $$;
create or replace trigger gravada_so_quem_aprova before update on public.reunioes_gravadas for each row execute function public.gravada_so_quem_aprova();

-- Aviso no celular para uma lista de pessoas da equipe (mesma chave das Conversas).
create or replace function public.avisar_equipe(p_para uuid[], p_texto text, p_link text) returns void
language plpgsql security definer set search_path = public, vault as $$
declare chave text;
begin
  if p_para is null or cardinality(p_para) = 0 then return; end if;
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is null then return; end if;
  perform net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
    body := jsonb_build_object('texto', p_texto, 'link', p_link, 'para', to_jsonb(p_para)));
end $$;
revoke all on function public.avisar_equipe(uuid[], text, text) from public, anon, authenticated;

create or replace function public.gravada_avisar() returns trigger
language plpgsql security definer set search_path = public as $$
declare loja text; n int;
begin
  loja := coalesce((select p.loja from public.portais p where p.id = new.portal_id), 'reunião interna');
  if tg_op = 'INSERT' and new.status in ('rascunho', 'sem_loja') then
    perform public.avisar_equipe((select array_agg(id) from public.perfis where aprova),
      '🎥 Reunião para revisar: ' || loja || coalesce(' · ' || nullif(new.titulo, ''), ''), '/equipe/reunioes-revisar/');
  elsif tg_op = 'UPDATE' and new.status = 'aprovada' and old.status is distinct from 'aprovada' then
    select count(*) into n from jsonb_array_elements(coalesce(new.para_claudia, '[]'::jsonb)) x where coalesce(trim(x->>'texto'), '') <> '';
    if n > 0 then
      perform public.avisar_equipe((select array_agg(id) from public.perfis where conversas_equipe and not aprova),
        '✅ Camilla liberou ' || n || case when n = 1 then ' acompanhamento' else ' acompanhamentos' end || ' da ' || loja, '/empresa/cs/');
    end if;
  end if;
  return null;
end $$;
revoke all on function public.gravada_avisar() from public, anon, authenticated;
create or replace trigger gravada_avisar after insert or update on public.reunioes_gravadas for each row execute function public.gravada_avisar();
