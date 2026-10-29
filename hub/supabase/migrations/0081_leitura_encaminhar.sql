-- Leitura da semana: a equipe revisa e encaminha (pronta); só a Camilla (quem aprova) publica para a loja.
alter table public.loja_leituras add column if not exists pronta boolean not null default false;

create or replace function public.leitura_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Sem login (agente), a loja marcando as ações e quem aprova: segue como antes.
  if auth.uid() is null or not public.is_equipe() or public.pode_aprovar() then return new; end if;
  if new.publicada and (tg_op = 'INSERT' or not old.publicada) then
    raise exception 'Só a Camilla publica a leitura. Use "Encaminhar para a Camilla publicar".';
  end if;
  if tg_op = 'UPDATE' and old.publicada and new.publicada and (new.texto is distinct from old.texto or new.acoes is distinct from old.acoes) then
    raise exception 'A leitura já está publicada. Para mudar, peça à Camilla.';
  end if;
  return new;
end $$;

drop trigger if exists leitura_so_quem_aprova on public.loja_leituras;
create trigger leitura_so_quem_aprova before insert or update on public.loja_leituras
  for each row execute function public.leitura_so_quem_aprova();
