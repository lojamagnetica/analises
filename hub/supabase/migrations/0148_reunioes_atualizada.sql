-- Quando a reunião/feedback é editado, o atalho do Início volta a avisar "tem novidade".
alter table public.loja_reunioes add column if not exists updated_at timestamptz not null default now();
create or replace function public.trg_reuniao_atualizada() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists reuniao_atualizada on public.loja_reunioes;
create trigger reuniao_atualizada before update on public.loja_reunioes for each row execute function public.trg_reuniao_atualizada();
