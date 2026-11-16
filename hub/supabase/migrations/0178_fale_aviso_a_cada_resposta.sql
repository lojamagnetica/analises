-- Fale com a Camilla como aplicativo no celular da loja: cada resposta da equipe avisa na hora,
-- com o texto da mensagem, e o toque abre direto a conversa (/fale/). Antes saía um aviso genérico
-- ("Sua pergunta foi respondida"), no máximo a cada 6 horas.
set lock_timeout = '8s';

create or replace function public.trg_fale_avisar() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare chave text; pessoas uuid[]; resumo text;
begin
  -- Só a resposta escrita pela equipe: mensagem da loja e lembrete automático não avisam.
  if not new.equipe or coalesce(new.automatica, false) then return new; end if;
  select array_agg(f.id) into pessoas from public.perfis f
   where f.portal_id = new.portal_id and f.papel <> 'equipe'
     and exists (select 1 from public.push_assinaturas a where a.user_id = f.id);
  if pessoas is null then return new; end if;
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is null then return new; end if;
  -- A loja vê a equipe inteira como "Camilla".
  resumo := 'Camilla: ' || case when coalesce(new.texto, '') <> '' then left(new.texto, 110) else '🎤 mandou um áudio' end;
  perform net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
    body := jsonb_build_object('texto', resumo, 'link', '/fale/', 'para_lojas', to_jsonb(pessoas), 'titulo', 'Fale com a Camilla'));
  return new;
end $$;
revoke all on function public.trg_fale_avisar() from public, anon, authenticated;

drop trigger if exists fale_avisar on public.solicitacao_respostas;
create trigger fale_avisar after insert on public.solicitacao_respostas
  for each row execute function public.trg_fale_avisar();

-- O aviso genérico antigo sai, para a loja não receber dois avisos da mesma resposta.
drop trigger if exists aviso_resposta on public.solicitacoes;
