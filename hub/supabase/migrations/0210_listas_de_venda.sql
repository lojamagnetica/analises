-- Registro de venda (Vendas do dia, estoque e compras): os tipos de peça e as linhas/marcas passam a ser de cada loja.
-- Sem configuração, continuam as listas de joias. Ex.: {"tipos": ["Vestido", ...], "linhas": ["Marca A", ...], "rotulo_linha": "Marca"}
alter table portais add column if not exists venda_listas jsonb;
