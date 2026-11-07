-- Modelos de contrato: toda alteração vira uma versão guardada (quem, quando, o quê) e um alerta só para
-- quem aprova e quem monta (Camilla e Claudia), na tela Novidades e no celular.
set lock_timeout = '8s';

-- Novidades com destinatário: vazio = toda a equipe (como antes); preenchido = só essas pessoas.
alter table public.novidades add column if not exists para uuid[];
drop policy if exists novidades_equipe on public.novidades;
create policy novidades_equipe on public.novidades for select using (public.is_equipe() and (para is null or auth.uid() = any (para)));

create or replace function public.push_destinos_para(p uuid[]) returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select a.id, a.endpoint, a.p256dh, a.auth from push_assinaturas a join perfis f on f.id = a.user_id where f.papel = 'equipe' and a.user_id = any (p);
$$;
revoke all on function public.push_destinos_para(uuid[]) from public, anon, authenticated;
grant execute on function public.push_destinos_para(uuid[]) to service_role;

create or replace function public.novidade_avisar() returns trigger
language plpgsql security definer set search_path = public, vault as $$
declare chave text;
begin
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is not null then
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
      body := jsonb_build_object('texto', new.texto, 'link', new.link, 'para', to_jsonb(new.para)));
  end if;
  return new;
end $$;

-- As versões dos modelos (só leitura para a equipe; quem grava é o gatilho).
create table if not exists public.contrato_modelo_versoes (
  id          bigint generated always as identity primary key,
  plano_id    text not null,
  titulo      text,
  texto       text,
  aprovado    boolean,
  acao        text not null,
  por_id      uuid,
  por_nome    text,
  created_at  timestamptz not null default now()
);
create index if not exists contrato_versoes_plano on public.contrato_modelo_versoes (plano_id, created_at desc);
alter table public.contrato_modelo_versoes enable row level security;
create policy contrato_versoes_equipe on public.contrato_modelo_versoes for select using (public.is_equipe());
grant select on public.contrato_modelo_versoes to authenticated;

create or replace function public.contrato_modelo_mudou() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record; quem text; o_que text[] := '{}'; acao text; para uuid[];
begin
  r := case when tg_op = 'DELETE' then old else new end;
  if tg_op = 'UPDATE' then
    if new.texto is not distinct from old.texto and new.titulo is not distinct from old.titulo and new.aprovado is not distinct from old.aprovado then
      return new;
    end if;
    if new.texto is distinct from old.texto then o_que := array_append(o_que, 'o texto'); end if;
    if new.titulo is distinct from old.titulo then o_que := array_append(o_que, 'o título'); end if;
    if new.aprovado is distinct from old.aprovado then o_que := array_append(o_que, case when new.aprovado then 'marcou como aprovado' else 'tirou a aprovação' end); end if;
    acao := 'alterou ' || array_to_string(o_que, ', ');
  elsif tg_op = 'INSERT' then
    acao := 'criou o modelo';
  else
    acao := 'excluiu o modelo';
  end if;
  -- O nome vem da conta logada (não do que a tela manda), para não dar para assinar por outra pessoa.
  quem := coalesce((select nome from perfis where id = auth.uid()), 'Alguém direto no banco');
  insert into contrato_modelo_versoes (plano_id, titulo, texto, aprovado, acao, por_id, por_nome)
    values (r.plano_id, r.titulo, r.texto, r.aprovado, acao, auth.uid(), quem);
  begin
    select array_agg(id) into para from perfis where papel = 'equipe' and (aprova or monta);
    if para is not null then
      insert into novidades (tipo, texto, link, para) values ('contrato', left('📝 ' || quem || ' ' || acao || ' · ' || coalesce(r.titulo, r.plano_id), 300), '/empresa/contratos?plano=' || r.plano_id, para);
    end if;
  exception when others then
    -- O alerta nunca pode impedir de salvar o modelo.
    raise warning 'contrato_modelo_mudou: %', sqlerrm;
  end;
  return r;
end $$;
drop trigger if exists contrato_modelo_mudou on public.contrato_modelos;
create trigger contrato_modelo_mudou after insert or update or delete on public.contrato_modelos for each row execute function public.contrato_modelo_mudou();

-- Ponto de partida: a versão que está valendo hoje de cada modelo (as anteriores não foram guardadas).
insert into public.contrato_modelo_versoes (plano_id, titulo, texto, aprovado, acao, por_nome, created_at)
  select plano_id, titulo, texto, aprovado, 'versão em uso quando o histórico começou', updated_by, updated_at from public.contrato_modelos
  where not exists (select 1 from public.contrato_modelo_versoes v where v.plano_id = contrato_modelos.plano_id);
