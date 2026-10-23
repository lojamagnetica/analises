-- Curso Loja Magnética · 16 fundamentos, estruturado pelo Mapa do Curso.
-- 1 aula = 1 fundamento = 1 ferramenta + 1 missão de 7 dias + 1 prova. Só avança quando entrega a prova.

-- ───────────── Estrutura do curso (a equipe edita, todo mundo logado lê) ─────────────

create table public.curso_modulos (
  id       text primary key,
  ordem    int  not null,
  titulo   text not null,
  promessa text,
  pilar    text            -- '01'..'04' nos módulos dos fundamentos
);

create table public.curso_fundamentos (
  codigo    text primary key,          -- '01.1' … '04.4'
  modulo_id text not null references public.curso_modulos (id),
  ordem     int  not null,
  titulo    text not null,
  rotulo    text not null,             -- como aparece em "Fundamentos implantados" na ficha da loja
  promessa  text,
  missao    text not null,
  prova     text not null,
  efeito    text
);

create table public.curso_aulas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,    -- '0.1', '1.1', '2', 'B', 'E'…
  modulo_id   text not null references public.curso_modulos (id),
  fundamento  text references public.curso_fundamentos (codigo),
  ordem       int  not null,
  titulo      text not null,
  duracao     int,                     -- minutos (todas têm até 15)
  topicos     text[] not null default '{}',
  video_url   text
);

create table public.curso_ferramentas (
  id         uuid primary key default gen_random_uuid(),
  modulo_id  text not null references public.curso_modulos (id),
  fundamento text references public.curso_fundamentos (codigo),
  ordem      int  not null default 0,
  nome       text not null,
  formato    text not null default 'Ficha', -- Planilha, PDF, Roteiro, Mensagens, Ficha, GPT, No Hub
  url        text                           -- vazio = ainda em produção
);

-- ───────────── Progresso de cada loja (a própria loja e a equipe) ─────────────

create table public.curso_raiox (
  portal_id  uuid not null references public.portais (id) on delete cascade,
  codigo     text not null references public.curso_fundamentos (codigo),
  nota       int  not null check (nota between 0 and 2), -- 0 não existe · 1 existe, mas não roda sempre · 2 funciona toda semana
  updated_at timestamptz not null default now(),
  primary key (portal_id, codigo)
);

create table public.curso_progresso (
  portal_id uuid not null references public.portais (id) on delete cascade,
  tipo      text not null check (tipo in ('aula', 'prova')),
  item      text not null,            -- código da aula ou do fundamento
  feito_em  timestamptz not null default now(),
  primary key (portal_id, tipo, item)
);

-- A prova entregue entra sozinha em "Fundamentos implantados" na ficha da loja (o placar da equipe).
create function public.sincronizar_fundamento() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if tg_op = 'INSERT' and new.tipo = 'prova' then
    select rotulo into r from curso_fundamentos where codigo = new.item;
    if r is not null then
      update fichas set fundamentos = array(select distinct x from unnest(fundamentos || r) x order by x), updated_at = now()
      where portal_id = new.portal_id;
    end if;
  elsif tg_op = 'DELETE' and old.tipo = 'prova' then
    select rotulo into r from curso_fundamentos where codigo = old.item;
    if r is not null then
      update fichas set fundamentos = array_remove(fundamentos, r), updated_at = now() where portal_id = old.portal_id;
    end if;
  end if;
  return null;
end $$;

create trigger ao_mudar_prova
  after insert or delete on public.curso_progresso
  for each row execute function public.sincronizar_fundamento();

revoke execute on function public.sincronizar_fundamento() from public, anon, authenticated;

-- ───────────── Segurança ─────────────

alter table public.curso_modulos     enable row level security;
alter table public.curso_fundamentos enable row level security;
alter table public.curso_aulas       enable row level security;
alter table public.curso_ferramentas enable row level security;
alter table public.curso_raiox       enable row level security;
alter table public.curso_progresso   enable row level security;

create policy curso_modulos_ler       on public.curso_modulos     for select to authenticated using (true);
create policy curso_modulos_equipe    on public.curso_modulos     for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_fund_ler          on public.curso_fundamentos for select to authenticated using (true);
create policy curso_fund_equipe       on public.curso_fundamentos for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_aulas_ler         on public.curso_aulas       for select to authenticated using (true);
create policy curso_aulas_equipe      on public.curso_aulas       for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_ferr_ler          on public.curso_ferramentas for select to authenticated using (true);
create policy curso_ferr_equipe       on public.curso_ferramentas for all using (public.is_equipe()) with check (public.is_equipe());
create policy curso_raiox_tudo        on public.curso_raiox       for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy curso_progresso_tudo    on public.curso_progresso   for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- ───────────── Conteúdo do Mapa do Curso ─────────────

insert into public.curso_modulos (id, ordem, titulo, promessa, pilar) values
  ('aula-0',       0, 'Aula 0 · Raio-X da sua loja',              'A loja descobre onde está nos 16 fundamentos e por onde começar', null),
  ('m01',          1, 'Módulo 01 · Gestão Analítica',             'Ler a loja pelos números, sem achismo', '01'),
  ('m02',          2, 'Módulo 02 · Gestão de Pessoas',            'Uma equipe que vende sem você no balcão', '02'),
  ('m03',          3, 'Módulo 03 · Processos Comerciais',         'Vender mais para quem já comprou', '03'),
  ('m04',          4, 'Módulo 04 · Marketing e Conteúdo',         'A loja ser desejada e ser encontrada', '04'),
  ('encerramento', 5, 'Encerramento · Manual da sua Loja Magnética', 'As 16 ferramentas preenchidas viram o Manual da loja: o jeito de funcionar, por escrito', null);

insert into public.curso_fundamentos (codigo, modulo_id, ordem, titulo, rotulo, promessa, missao, prova, efeito) values
  ('01.1', 'm01',  1, 'Indicadores da loja',     '01.1 Indicadores',            null, 'Preencher o painel duas semanas seguidas', 'Print do painel em 2 semanas seguidas', null),
  ('01.2', 'm01',  2, 'Curva ABC',               '01.2 Curva ABC',              null, 'Montar a curva e tirar uma decisão dela na semana', 'Curva montada + 1 decisão registrada', 'A loja descobre que poucas peças sustentam o mês'),
  ('01.3', 'm01',  3, 'Estoque com giro',        '01.3 Estoque com giro',       null, 'Gerar a Lista do Parado e fazer uma ação de saída', 'Lista do parado + plano de compra da próxima coleção', 'Comprar com o representante olhando a planilha, e não o mostruário'),
  ('01.4', 'm01',  4, 'Metas',                   '01.4 Metas',                  null, 'Publicar a meta de cada vendedor e fechar o caixa todos os dias', 'Meta individual publicada + 1 semana de caixa fechado e Fluxo diário lançado', 'Cada vendedor sabe o próprio número e o que desenvolver'),
  ('02.1', 'm02',  5, 'Papéis e combinados',     '02.1 Papéis e combinados',    'Cada pessoa sabe o que é dela, e as regras não dependem do humor do dia', 'Escrever e apresentar os combinados para a equipe', 'Documento + foto dele apresentado ou fixado', 'O fim do "ninguém me avisou"'),
  ('02.2', 'm02',  6, 'Rotina diária',           '02.2 Rotina diária',          'A loja abre, funciona e fecha igual todos os dias', 'Usar o checklist com a equipe cinco dias seguidos', 'Checklist preenchido em 5 dias seguidos', 'A loja funciona igual com o dono presente ou não'),
  ('02.3', 'm02',  7, 'Atendimento padrão',      '02.3 Atendimento padrão',     'Todo cliente recebe o mesmo atendimento que vende', 'Treinar o roteiro com a equipe e aplicar na semana', 'Roteiro + registro de 1 treino com a equipe', 'Mais peças por atendimento já na primeira semana'),
  ('02.4', 'm02',  8, 'Reunião semanal',         '02.4 Reunião semanal',        'Vinte minutos por semana que alinham números, treino e combinados', 'Fazer duas reuniões seguidas pela pauta', 'Pauta + registro de 2 reuniões seguidas', 'A equipe chega sabendo o que vai ser cobrado'),
  ('03.1', 'm03',  9, 'Carteira de clientes',    '03.1 Carteira de clientes',   'Toda venda vira um cadastro, e todo cadastro tem dono', 'Cadastrar toda venda da semana e dividir a carteira', '% de vendas com cadastro na semana (meta 90% ou mais) + carteira dividida', 'A carteira vira o ativo mais valioso da loja'),
  ('03.2', 'm03', 10, 'Pós-venda',               '03.2 Pós-venda',              'O cliente sente que comprou de alguém, e não de uma loja', 'Fazer o pós-venda de todas as vendas da semana', 'Print de 5 pós-vendas da semana', 'Cliente responde agradecendo e volta'),
  ('03.3', 'm03', 11, 'Recompra',                '03.3 Recompra',               'Trazer de volta quem já comprou, com data marcada', 'Chamar a lista do mês e contar quantos voltaram', 'Lista do mês + contatados + quantos voltaram', 'Venda em dia fraco sem gastar com anúncio'),
  ('03.4', 'm03', 12, 'Ações estratégicas',      '03.4 Ações estratégicas',     'Datas comerciais planejadas com antecedência, e não no improviso', 'Planejar os próximos 3 meses e executar uma ação', 'Calendário + 1 ação executada com resultado', 'A loja sabe hoje o que vai vender daqui a 90 dias'),
  ('04.1', 'm04', 13, 'Perfil magnético',        '04.1 Perfil magnético',       'Quem entra no perfil entende em 5 segundos o que a loja vende e por que comprar ali', 'Refazer bio e destaques', 'Print antes e depois, conferido pelo checklist da análise de perfil', 'Antes e depois lado a lado'),
  ('04.2', 'm04', 14, 'Calendário estratégico',  '04.2 Calendário estratégico', 'Conteúdo toda semana sem travar na ideia', 'Cumprir o calendário duas semanas seguidas', 'Calendário + 2 semanas seguidas cumpridas', 'A equipe grava sem depender do dono'),
  ('04.3', 'm04', 15, 'Vitrine',                 '04.3 Vitrine',                'Vitrine que para quem passa e vende a peça certa', 'Fazer duas trocas no prazo', 'Fotos de 2 trocas no prazo', 'Vitrine ligada à Curva ABC: vende o que gira'),
  ('04.4', 'm04', 16, 'Atrair clientes novos',   '04.4 Atrair clientes novos',  'Transformar seguidor em cliente cadastrado', 'Rodar o caminho por uma semana e cadastrar os novos', 'Clientes novos vindos do Instagram no mês, já cadastrados', 'O Instagram passa a ter número de venda, e não só de curtida');

insert into public.curso_aulas (codigo, modulo_id, fundamento, ordem, titulo, duracao, topicos) values
  ('0.1', 'aula-0', null, 1, 'A mentalidade do dono', 15, array[
    'Ninguém vai querer mais que o dono: a loja é reflexo de quem está no comando',
    'A equipe espelha o dono: horário, organização, energia, jeito de atender e de cobrar',
    'Do dono operador (apaga incêndio no balcão) ao dono gestor (cria o processo e cobra o processo)',
    'Compromisso com o processo, e não com a motivação do dia',
    'Decisão no lugar de desculpa: mercado, economia e equipe não explicam tudo',
    'Fecha com o compromisso: você assina o próprio Contrato de Foco na aula 0.4']),
  ('0.2', 'aula-0', null, 2, 'Como usar este curso', 8, array[
    'A promessa e o formato: ferramenta, missão de 7 dias e prova',
    'Placar Magnético 0/16 e a prova por autoavaliação',
    'A ordem dos pilares e como pular o que já funciona']),
  ('0.3', 'aula-0', null, 3, 'Raio-X da sua loja', 15, array[
    'Nota 0, 1 ou 2 para cada um dos 16 fundamentos',
    'O radar por pilar, o placar e por onde começar',
    'Preenchido ao vivo na tela, junto com você']),
  ('0.4', 'aula-0', null, 4, 'Foto do Dia Zero + Contrato de Foco', 12, array[
    'Foto do Dia Zero: faturamento do mês, ticket médio, peças por atendimento, preço médio e clientes cadastrados',
    'Onde achar cada número no sistema: todos saem do relatório de vendas, sem depender da equipe',
    'Contrato de Foco: a partir do radar, você escolhe o resultado número 1 dos próximos 90 dias']),
  ('1.1', 'm01', '01.1', 1, 'Os 4 números da loja', null, array[
    'Faturamento, ticket médio, peças por atendimento (PA) e preço médio (PM): o que é e como calcular cada um',
    'Ticket médio = PA × PM: quando o ticket cai, dá para ver se foi o PA ou o PM',
    'Conversão fica fora dos números controlados por enquanto: medir entradas com segurança depende da equipe',
    'Lista da Vez: ordem de atendimento e motivo de quem sai sem comprar']),
  ('1.2', 'm01', '01.1', 2, 'O Painel Semanal', null, array[
    'O Painel Semanal dos 4 números na planilha',
    'Semáforo verde, amarelo e vermelho comparando a loja com ela mesma, e não com a média do mercado',
    'O que cada número está dizendo e o que fazer quando fica vermelho',
    'Assistente Analítico: exportar o relatório, mandar para o GPT e colar na planilha']),
  ('2',   'm01', '01.2', 3, 'Curva ABC', null, array[
    'Cole o relatório de vendas e a planilha separa A, B e C',
    'As 5 decisões com a curva: vitrine, exposição, reposição, foco de venda e saída',
    'Mapa da loja: onde ficam as peças A (frente, provador, ponto quente)']),
  ('3.1', 'm01', '01.3', 4, 'Cobertura e Lista do Parado', null, array[
    'Cobertura em meses por categoria',
    'Lista do Parado: peças sem venda há 90 dias e o plano de saída (kit, vitrine, ação com a carteira)']),
  ('3.2', 'm01', '01.3', 5, 'Comprar pelo giro com representante e no showroom', null, array[
    'Ficha de visita: o que pedir, quanto e em qual grade, pelo giro',
    'Checklist de recebimento de mercadoria']),
  ('4',   'm01', '01.4', 6, 'Meta individual e fechamento de caixa', null, array[
    'Por que meta individual: a coletiva desmotiva quem vende bem, deixa a gestão cega e não mostra o que desenvolver',
    'Meta de cada vendedor → fluxo diário → fechamento de caixa → placar por vendedor',
    'Ritual da abertura: 5 minutos com o placar, o destaque da semana e o foco de desenvolvimento']),
  ('5',   'm02', '02.1', 1, 'Papéis e combinados', null, array[
    'Quem faz o quê: o Mapa de Funções',
    'O Código da Loja: horários, celular, uniforme, atendimento, provador, organização',
    'Como apresentar os combinados para a equipe']),
  ('6',   'm02', '02.2', 2, 'Rotina diária', null, array[
    'Checklist de abertura, durante o dia e fechamento',
    'Tarefas fixas por dia da semana: vitrine, estoque, conteúdo, carteira',
    'Versão da equipe: o checklist no celular de cada vendedor']),
  ('7',   'm02', '02.3', 3, 'Atendimento padrão', null, array[
    'Os 7 passos: abordagem, sondagem, demonstração, provador, venda adicional, fechamento e cadastro',
    'Frases que vendem x frases que travam',
    'Objeções: "está caro", "vou pensar", "volto depois"',
    'Diferenças no atendimento de clientes homens e mulheres',
    'Aula própria para você passar no treino da equipe']),
  ('8',   'm02', '02.4', 4, 'Reunião semanal', null, array[
    'Pauta fixa de 20 minutos: números, vitória da semana, 1 treino, combinados',
    'Feedback individual',
    'Registro das reuniões']),
  ('B',   'm02', null, 5, 'Bônus · Contratar certo', null, array[
    'Anúncio da vaga',
    'Roteiro de entrevista',
    'Plano dos primeiros 30 dias de quem entra']),
  ('9',   'm03', '03.1', 1, 'Carteira de clientes', null, array[
    'Cadastro mínimo: nome, WhatsApp, aniversário, tamanho, estilo, última compra',
    'A carteira dividida por vendedor',
    'Placar de cadastro: % das vendas com cadastro (meta 90%)']),
  ('10',  'm03', '03.2', 2, 'Pós-venda', null, array[
    'Régua de pós-venda: dia seguinte, 7 dias, 30 dias',
    'Etiquetas do WhatsApp Business para organizar a carteira']),
  ('11',  'm03', '03.3', 3, 'Recompra', null, array[
    'Régua de recompra: aniversário, chegada de coleção, clientes sem comprar há 90 dias',
    'A lista do mês: quem chamar nesta semana',
    'Placar de quantos voltaram']),
  ('12',  'm03', '03.4', 4, 'Ações estratégicas', null, array[
    'Calendário comercial do varejo de moda (12 meses)',
    'Ficha de ação: objetivo, público, oferta, meta, divulgação, resultado',
    'Modelos prontos: pré-Black com lista e grupo fechado, Dia das Mães, Natal, liquidação',
    'Pós-ação: o que repetir e o que cortar']),
  ('13',  'm04', '04.1', 1, 'Perfil magnético', null, array[
    'Análise de perfil: bio, foto, destaques, linha de conteúdo',
    'Modelos de bio',
    'Destaques essenciais: chegou, provador, quem somos, como comprar']),
  ('14',  'm04', '04.2', 2, 'Calendário estratégico', null, array[
    'Calendário de conteúdo: formatos validados, quem grava, datas comerciais',
    'Cadência de 2 conteúdos por dia',
    'Banco de ganchos e roteiro de reels de 35 segundos',
    'Planner da semana de gravação']),
  ('15',  'm04', '04.3', 3, 'Vitrine', null, array[
    'Regras de montagem: cor, volume, ponto focal, peça A da curva',
    'Calendário de troca',
    'Foto antes e depois']),
  ('16',  'm04', '04.4', 4, 'Atrair clientes novos', null, array[
    'Caminho até a venda: Stories → WhatsApp → cadastro (palavra-chave no reels como reforço)',
    'Script de resposta no direct e no WhatsApp',
    'Placar de clientes novos vindos do Instagram']),
  ('E',   'encerramento', null, 1, 'Manual da sua Loja Magnética', null, array[
    'As 16 ferramentas preenchidas viram o Manual da loja',
    'Foto do Dia 90 x Foto do Dia Zero: o antes e depois dos 4 números',
    'Selo por pilar (4/4) e Selo Loja Magnética ao completar 16/16 provas',
    'Próximo nível: mentoria para quem quer acompanhamento']);

insert into public.curso_ferramentas (modulo_id, fundamento, ordem, nome, formato, url) values
  ('aula-0', null, 1, 'Espelho do Dono: 10 perguntas sobre o que a equipe vê em você', 'Ficha', null),
  ('aula-0', null, 2, 'Raio-X dos 16 com radar', 'No Hub', null),
  ('aula-0', null, 3, 'Foto do Dia Zero', 'Ficha', null),
  ('aula-0', null, 4, 'Contrato de Foco', 'Ficha', null),
  ('m01', '01.1', 1, 'Painel Semanal dos 4 números', 'Planilha', null),
  ('m01', '01.1', 2, 'Lista da Vez', 'Ficha', null),
  ('m01', '01.1', 3, 'Assistente Analítico Loja Magnética', 'GPT', 'https://chatgpt.com/g/g-6ad489987428819188cb35f2f885b92d-assistente-analitico-loja-magnetica'),
  ('m01', '01.1', 4, 'Quadro dos números da semana para a reunião de segunda', 'PDF', null),
  ('m01', '01.2', 1, 'Curva ABC automática', 'Planilha', null),
  ('m01', '01.2', 2, 'Roteiro das 5 decisões com a curva', 'Roteiro', null),
  ('m01', '01.2', 3, 'Assistente Analítico Loja Magnética', 'GPT', 'https://chatgpt.com/g/g-6ad489987428819188cb35f2f885b92d-assistente-analitico-loja-magnetica'),
  ('m01', '01.3', 1, 'Cobertura de estoque + Lista do Parado', 'Planilha', null),
  ('m01', '01.3', 2, 'Ficha de visita ao showroom', 'Ficha', null),
  ('m01', '01.3', 3, 'Checklist de recebimento de mercadoria', 'PDF', null),
  ('m01', '01.3', 4, 'Assistente Analítico Loja Magnética', 'GPT', 'https://chatgpt.com/g/g-6ad489987428819188cb35f2f885b92d-assistente-analitico-loja-magnetica'),
  ('m01', '01.4', 1, 'Meta Individual e Fluxo Diário (com fechamento de caixa)', 'Planilha', null),
  ('m01', '01.4', 2, 'Fluxo de Fechamento de Caixa em 7 passos', 'PDF', null),
  ('m01', '01.4', 3, 'Quadro de Meta Individual', 'PDF', null),
  ('m02', '02.1', 1, 'Mapa de Funções', 'PDF', null),
  ('m02', '02.1', 2, 'Código da Loja', 'PDF', null),
  ('m02', '02.1', 3, 'Roteiro da reunião de apresentação dos combinados', 'Roteiro', null),
  ('m02', '02.2', 1, 'Checklists de abertura, durante o dia e fechamento', 'PDF', null),
  ('m02', '02.2', 2, 'Quadro de tarefas fixas por dia da semana', 'PDF', null),
  ('m02', '02.3', 1, 'Atendimento em 7 passos + objeções', 'Roteiro', null),
  ('m02', '02.3', 2, 'Frases que vendem x frases que travam', 'Roteiro', null),
  ('m02', '02.3', 3, 'Cartas de treino', 'PDF', null),
  ('m02', '02.4', 1, 'Pauta da reunião semanal + ficha de feedback', 'Roteiro', null),
  ('m02', '02.4', 2, 'Registro das reuniões', 'Ficha', null),
  ('m02', null,   9, 'Anúncio da vaga e roteiro de entrevista', 'Roteiro', null),
  ('m02', null,  10, 'Plano dos primeiros 30 dias', 'Ficha', null),
  ('m03', '03.1', 1, 'Ficha de cadastro mínimo', 'Ficha', null),
  ('m03', '03.1', 2, 'Carteira de clientes (CRM simples)', 'Planilha', null),
  ('m03', '03.2', 1, 'Régua de pós-venda', 'Mensagens', null),
  ('m03', '03.2', 2, 'Etiquetas do WhatsApp Business', 'Roteiro', null),
  ('m03', '03.3', 1, 'Régua de recompra', 'Mensagens', null),
  ('m03', '03.3', 2, 'Lista do mês de recompra', 'Planilha', null),
  ('m03', '03.4', 1, 'Calendário comercial de 12 meses', 'Ficha', null),
  ('m03', '03.4', 2, 'Ficha de ação estratégica', 'Ficha', null),
  ('m03', '03.4', 3, 'Convites de ação estratégica', 'Mensagens', null),
  ('m04', '04.1', 1, 'Checklist do perfil', 'PDF', null),
  ('m04', '04.1', 2, 'Modelos de bio e destaques essenciais', 'Roteiro', null),
  ('m04', '04.2', 1, 'Calendário de conteúdo', 'Planilha', null),
  ('m04', '04.2', 2, 'Reels de 35 segundos + banco de ganchos', 'Roteiro', null),
  ('m04', '04.2', 3, 'Planner da semana de gravação', 'Ficha', null),
  ('m04', '04.3', 1, 'Regras de vitrine + calendário de troca', 'PDF', null),
  ('m04', '04.3', 2, 'Checklist de foto antes e depois', 'PDF', null),
  ('m04', '04.4', 1, 'Script de direct e WhatsApp', 'Roteiro', null),
  ('m04', '04.4', 2, 'Placar de clientes novos vindos do Instagram', 'Planilha', null),
  ('encerramento', null, 1, 'Manual da sua Loja Magnética', 'No Hub', null),
  ('encerramento', null, 2, 'Foto do Dia 90', 'Ficha', null);
