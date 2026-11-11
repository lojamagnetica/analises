-- Aviso no celular quando chega mensagem nas Conversas da equipe: vai só para a outra pessoa (quem não escreveu).
-- Usa o mesmo caminho dos outros avisos (função "avisar", com a chave guardada no cofre). Título "Conversas".
set lock_timeout = '8s';
create or replace function public.trg_conversa_avisar() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare chave text; destino uuid[]; resumo text;
begin
  select array_agg(id) into destino from public.perfis where conversas_equipe and id is distinct from new.autor;
  if destino is null then return new; end if;
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is null then return new; end if;
  resumo := coalesce(new.autor_nome, 'Equipe') || ': ' || case when coalesce(new.texto, '') <> '' then left(new.texto, 90) else '📎 enviou um arquivo' end;
  perform net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
    body := jsonb_build_object('texto', resumo, 'link', '/conversas/', 'para', to_jsonb(destino), 'titulo', 'Conversas'));
  return new;
end $$;
revoke all on function public.trg_conversa_avisar() from public, anon, authenticated;
drop trigger if exists conversa_avisar on public.equipe_conversas;
create trigger conversa_avisar after insert on public.equipe_conversas for each row execute function public.trg_conversa_avisar();
