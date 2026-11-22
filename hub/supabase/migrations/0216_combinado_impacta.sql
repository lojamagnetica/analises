-- Todo combinado da loja responde "esse passo vira o resultado?": true = a CS acompanha; false = rotina, só o Hub lembra a loja; null = ainda não decidido (a CS acompanha).
set lock_timeout='8s';
alter table loja_combinados add column if not exists impacta boolean;
comment on column loja_combinados.impacta is 'Esse passo vira o resultado? true = a CS acompanha; false = rotina, só o Hub lembra a loja; null = ainda não decidido (a CS acompanha).';
