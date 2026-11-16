-- Conferência do caixa: quem lançou cada dia e quem corrigiu depois (a dona confere o que o time lançou).
set lock_timeout = '8s';
alter table public.loja_caixa add column if not exists lancado_por text;
alter table public.loja_caixa add column if not exists corrigido_por text;
alter table public.loja_caixa add column if not exists atualizado_em timestamptz;

-- O que já existia (antes do gatilho; a marca evita que o caixa_tira_origem apague a origem): o dia que veio do link dos canais.
select set_config('lm.caixa_canais', '1', true);
update public.loja_caixa set lancado_por = 'Link de vendas por canal' where origem = 'canais' and lancado_por is null;

create or replace function public.caixa_quem_lancou() returns trigger
language plpgsql security definer set search_path = public as $$
declare quem text;
begin
  if auth.uid() is not null then
    select coalesce(nullif(trim(nome), ''), email) into quem from perfis where id = auth.uid();
  elsif coalesce(current_setting('lm.caixa_quem', true), '') <> '' then
    -- Ajuste feito pela equipe direto no banco (ex.: pelo relatório do sistema): o nome vem na sessão.
    quem := current_setting('lm.caixa_quem', true);
  elsif coalesce(current_setting('lm.caixa_canais', true), '') = '1' then
    quem := 'Link de vendas por canal';
  else
    quem := 'Agente dos arquivos do caixa';
  end if;
  if tg_op = 'INSERT' then
    new.lancado_por := coalesce(quem, new.lancado_por);
  else
    new.lancado_por := coalesce(old.lancado_por, new.lancado_por);
    -- O link dos canais refaz o dia a cada venda: não conta como correção.
    if quem is distinct from old.lancado_por then new.corrigido_por := coalesce(quem, new.corrigido_por); end if;
    new.atualizado_em := now();
  end if;
  return new;
end $$;
drop trigger if exists caixa_quem_lancou on public.loja_caixa;
create trigger caixa_quem_lancou before insert or update on public.loja_caixa for each row execute function public.caixa_quem_lancou();
