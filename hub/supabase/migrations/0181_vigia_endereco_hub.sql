-- O vigia passa a conferir o endereço que as lojas usam (hub.ometodolojamagnetica.com.br, no Cloudflare).
set lock_timeout = '8s';
create or replace function public.site_verificar() returns void
language plpgsql security definer set search_path = public, net as $$
declare v record; r record; deu_certo boolean; quem uuid[];
begin
  select * into v from site_vigia where id = 1 for update;
  if v.ultimo_pedido is not null then
    select status_code, timed_out, error_msg into r from net._http_response where id = v.ultimo_pedido;
    if found then
      deu_certo := coalesce(r.status_code, 0) between 200 and 399;
      select array_agg(id) into quem from perfis where papel = 'equipe' and (aprova or conversas_equipe);
      if deu_certo then
        if not v.ok then
          update site_quedas set voltou_em = now() where voltou_em is null;
          perform avisar_equipe(quem, 'O site do Hub voltou ao ar. As lojas já conseguem entrar de novo.', '/equipe/conversas');
        end if;
        update site_vigia set ok = true, falhas = 0 where id = 1;
      else
        update site_vigia set falhas = falhas + 1 where id = 1;
        if v.ok and v.falhas + 1 >= 2 then
          update site_vigia set ok = false where id = 1;
          insert into site_quedas (codigo, detalhe) values (r.status_code, left(coalesce(r.error_msg, ''), 300));
          perform avisar_equipe(quem, 'O site do Hub está fora do ar (falha do servidor de hospedagem). Avise as lojas: não é senha, é só tentar de novo em alguns minutos.', '/equipe/conversas');
        end if;
      end if;
    end if;
  end if;
  update site_vigia set ultimo_pedido = net.http_get('https://hub.ometodolojamagnetica.com.br/analises/portal/login/', timeout_milliseconds := 15000), atualizado = now() where id = 1;
end;
$$;
revoke all on function public.site_verificar() from public, anon, authenticated;
