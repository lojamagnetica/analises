-- Conversas da equipe: responder fecha a mensagem. Quando alguém escreve na conversa (da loja ou geral),
-- as mensagens abertas da outra pessoa ali (Alinhamento ou Aviso) passam para concluída.
-- Pedido e Urgente continuam abertos até alguém tocar em Concluir.
create or replace function conversa_respondida() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.autor is null then return new; end if;
  update equipe_conversas c set status = 'concluida'
   where c.status = 'aberta' and c.id <> new.id and c.created_at <= new.created_at
     and c.portal_id is not distinct from new.portal_id
     and c.autor is distinct from new.autor
     and c.tipo in ('Alinhamento', 'Aviso');
  return new;
end $$;

drop trigger if exists trg_conversa_respondida on equipe_conversas;
create trigger trg_conversa_respondida after insert on equipe_conversas for each row execute function conversa_respondida();

-- Limpeza (19/11): as mensagens até 17/11 já foram revisadas e resolvidas.
update equipe_conversas set status = 'concluida' where status = 'aberta' and created_at < '2026-11-18';
