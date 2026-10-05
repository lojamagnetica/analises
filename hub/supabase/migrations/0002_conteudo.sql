-- Hub Loja Magnética · conteúdo inicial da Biblioteca
-- Tudo aqui pode ser editado depois pelo Hub, em Equipe → Biblioteca.

insert into public.jornada_passos (numero, titulo, descricao, conteudo) values
(1, 'Onboarding', 'Boas-vindas, próximos passos e acesso à comunidade.',
$md$Seja bem-vindo(a)! 🥂

Parabéns pela decisão de investir na sua LOJA!

A partir de agora, se comprometa com você mesmo(a) e com a sua empresa. Esse método foi desenvolvido para transformar a tua gestão e a tua Loja Magnética tão sonhada em realidade.

## PRÓXIMOS PASSOS

**1. Acesso à área de membros**
Você vai receber o acesso ao grupo de lojistas da Loja Magnética.
Club LOJA MAGNÉTICA · COMUNIDADE LOJA MAGNÉTICA

**2. Informações adicionais**
Eu e minha equipe vamos analisar as respostas e verificar se precisamos de algo para seguir com a sua análise.

**3. Encontros no MEET**
Os encontros são online. Baixe o app do Google Meet. As sessões são gravadas, e o link fixo fica na página inicial do PORTAL DA MENTORIA.

**4. Plano de Ação**
O seu **PLANO DE AÇÃO é 100% personalizado.** Por isso, após o prazo de envio da documentação, nosso processo de entrega leva até 7 dias. Nele você terá toda a estrutura para os próximos meses que estaremos juntos(as).

**5. Dúvidas entre os encontros**
Use a página Dúvidas aqui no Hub. Atendimento de segunda a sexta, das 9h às 18h (horário de Brasília).

**6. Suporte e experiência do cliente**
Nosso time de CS ajuda com acesso e plataforma, próximos passos e dúvidas, acompanha a sua jornada e colhe o seu feedback.

**7. Prazos de respostas e gravações**
Respondemos em até 12h úteis. As gravações ficam em Cursos e gravações.
A resposta de Camilla nos grupos sempre será em dois horários durante todo o dia, às 10h da manhã e às 16h da tarde. Assim podemos garantir produtividade e entrega para todos.

**8. Grupo e mensagens no WhatsApp**
Sem spam e sem divulgação. Participe, ajude e compartilhe.

**9. Acompanhamento no Hub**
Crie o hábito de entrar no seu PORTAL DA MENTORIA.

**10. FAQ**
- **Por quanto tempo tenho acesso?** O mesmo tempo do pacote do seu contrato.
- **Quais ferramentas vou usar?** Google Meet e este Hub.
- **E as dúvidas do negócio?** Na página Dúvidas e no WhatsApp, durante o período do plano.
- **E depois?** O próximo passo é o upgrade para a Mentoria VIP ANUAL.

Vamos juntos(as)!
Sua mentora, Camilla Ribeiro$md$),
(2, 'Diagnóstico', 'Análise da loja, do perfil e do estoque.',
$md$Com as respostas da Personalização, a planilha de estoque e a análise do seu Instagram, montamos o diagnóstico da sua loja. Ele é a base do seu Plano de Ação.$md$),
(3, 'Plano de Ação 90 dias', '100% personalizado. Entregue em até 7 dias após a documentação.',
$md$O seu Plano de Ação fica na página Plano de Ação 90 dias. Marque cada tarefa quando concluir: a Camilla acompanha daqui.$md$),
(4, 'Ferramentas', 'Portal do curso da metodologia completo.',
$md$Tudo o que você precisa para aplicar o método: o portal do curso completo, os scripts de venda e a calculadora de metas.$md$),
(5, 'Planejamento de Marketing', 'PLANEJE AQUI e Kanban de Conteúdo.',
$md$Planeje o ano no PLANEJE AQUI (um card por mês) e organize os posts no Kanban de Conteúdo.$md$),
(6, 'Reuniões Individuais', 'Encontros no Meet, gravações e atas.',
$md$As reuniões aparecem sozinhas na página Reuniões assim que são marcadas na agenda. Depois do encontro, a gravação fica disponível lá.$md$),
(7, 'Encerramento', 'Balanço dos resultados e próximos passos.',
$md$No encerramento revisamos os números, celebramos as conquistas e definimos os próximos passos da sua loja.$md$);

insert into public.script_categorias (id, titulo, icone, cor, ordem) values
('boas-vindas', 'Boas-vindas',             'hand',    '#E0301E', 1),
('salao',       'Atendimento no salão',    'bag',     '#7C3AED', 2),
('direct',      'Direct → WhatsApp',       'wpp',     '#16A34A', 3),
('objecoes',    'Quebra de objeções',      'bolt',    '#2563EB', 4),
('followup',    'Follow-up',               'refresh', '#EA580C', 5),
('colecao',     'Lançamento de coleção',   'spark',   '#E0301E', 6),
('malinha',     'Malinha / condicional',   'box',     '#7C3AED', 7),
('posvenda',    'Pós-venda',               'heart',   '#16A34A', 8),
('reativacao',  'Reativação de clientes',  'users',   '#2563EB', 9),
('aniversario', 'Aniversariantes',         'gift',    '#E0301E', 10),
('queima',      'Liquidação e queima',     'tag',     '#EA580C', 11),
('time',        'Reunião com o time',      'team',    '#7C3AED', 12);

insert into public.scripts (categoria, titulo, quando, texto, ordem) values
('boas-vindas', 'Primeira mensagem no WhatsApp', 'Quando a cliente chama pela primeira vez ou deixa o número na loja.',
$t$Oi, {cliente}! Aqui é a {seu_nome}, da {loja} 💛
Que bom ter você por aqui. Me conta: você está procurando algo para uma ocasião especial ou quer ver as novidades da semana?
Assim eu já separo as peças com a sua cara.$t$, 1),
('salao', 'Abordagem sem "posso ajudar?"', 'Quando a cliente entra na loja. Troque a pergunta fechada por uma conversa.',
$t$Oi, seja bem-vinda à {loja}! Fica à vontade.
Essa arara aqui chegou ontem, é a coleção nova. Você está procurando algo para o dia a dia ou para algum evento?$t$, 1),
('direct', 'Levar a conversa do Direct para o WhatsApp', 'Quando a cliente pergunta preço ou tamanho pelo Instagram.',
$t$Oi, {cliente}! Essa peça é linda mesmo 😍
Para eu te mandar fotos com detalhes, medidas e outras cores, me passa o seu WhatsApp? Lá eu consigo te atender com calma.
Ou se preferir, chama direto: {whatsapp}$t$, 1),
('objecoes', '"Tá caro"', 'Nunca discuta preço. Mostre valor e ofereça condição.',
$t$Entendo, {cliente}. Essa peça é de tecido que não amassa e dura muitas temporadas. Você usa no trabalho e no fim de semana.
Consigo parcelar em até 4x sem juros. Quer que eu separe para você provar com aquela calça que você levou da última vez?$t$, 1),
('objecoes', '"Vou pensar"', 'Descubra a objeção real antes de deixar a cliente ir.',
$t$Claro, {cliente}! Me conta: ficou em dúvida no modelo, no tamanho ou no valor?
Se quiser, eu reservo para você até amanhã às 18h. Assim ninguém leva antes.$t$, 2),
('followup', 'Cliente que não respondeu', '24 a 48 horas depois da última mensagem.',
$t$Oi, {cliente}! Passando para saber se você conseguiu ver as fotos que te mandei.
Separei a peça no seu tamanho, mas só consigo segurar até amanhã. Quer que eu mantenha?$t$, 1),
('colecao', 'Aviso de coleção nova (lista VIP)', 'Um dia antes de postar a coleção no Instagram.',
$t${cliente}, você é uma das primeiras a saber 🤫
Amanhã chega a coleção nova na {loja}, e as clientes VIP podem ver tudo hoje à noite, antes de todo mundo.
Quer que eu te mande as fotos às 20h?$t$, 1),
('malinha', 'Convite para malinha', 'Para as clientes da curva A, uma vez por mês.',
$t$Oi, {cliente}! Montei uma malinha com peças que combinam muito com você: {pecas}.
Posso mandar para a sua casa na quinta? Você prova com calma e devolve o que não quiser até sábado.$t$, 1),
('posvenda', 'Pós-venda em 3 dias', 'Três dias depois da compra.',
$t$Oi, {cliente}! Já usou o look novo? 😍
Se puder, me manda uma foto. Eu amo ver como ficou! E se quiser, posto no nosso Instagram {instagram} marcando você.$t$, 1),
('reativacao', 'Cliente sumida há mais de 90 dias', 'Para a lista de clientes inativas.',
$t${cliente}, que saudade de você aqui na {loja}!
Chegaram umas peças que lembram muito o seu estilo. Separei três para te mostrar. Posso te mandar as fotos?$t$, 1),
('aniversario', 'Mensagem de aniversário com presente', 'No dia do aniversário, de manhã.',
$t$Feliz aniversário, {cliente}! 🎉
Toda a equipe da {loja} deseja um ano lindo para você.
Seu presente: 15% de desconto em qualquer peça até o fim do mês. É só me chamar aqui.$t$, 1),
('queima', 'Queima de estoque para a base', 'Para girar as peças da curva C.',
$t${cliente}, só para as clientes da lista: separei peças selecionadas com até 40% off antes de abrir para o público.
São poucas unidades por tamanho. Quer que eu te mande as opções do seu número?$t$, 1),
('time', 'Reunião de segunda (20 minutos)', 'Toda segunda, antes de abrir a loja.',
$t$1. Resultado da semana passada: meta x realizado (3 min)
2. Quem vendeu mais e o que fez de diferente (3 min)
3. Meta da semana e meta de hoje (3 min)
4. Peças-foco da semana e argumentos de venda (5 min)
5. Script da semana: treinar em dupla (5 min)
6. Combinado final (1 min)$t$, 1);

insert into public.plano_modelo (mes, ordem, texto) values
(1, 1, 'Definir meta mensal e meta diária da loja'),
(1, 2, 'Organizar a base de clientes (nome, WhatsApp, aniversário, última compra)'),
(1, 3, 'Fazer a Curva ABC do estoque e separar as peças paradas'),
(1, 4, 'Reunião semanal de 20 minutos com o time às segundas'),
(1, 5, 'Ajustar a bio e os destaques do Instagram'),
(2, 1, 'Rodar o script de reativação para clientes há mais de 90 dias sem comprar'),
(2, 2, 'Lançar a malinha/condicional para as 30 melhores clientes'),
(2, 3, 'Ação de queima com as peças da curva C'),
(2, 4, 'Postar 4 Reels por semana seguindo o Kanban'),
(3, 1, 'Bater a meta de peças por atendimento'),
(3, 2, 'Montar a campanha da próxima data comercial no PLANEJE AQUI'),
(3, 3, 'Revisar números com a Camilla na reunião individual'),
(3, 4, 'Definir os próximos 90 dias');

insert into public.aulas (modulo, titulo, descricao, ordem) values
('Módulo 1 · Gestão e números da loja', 'Aula 1 · Meta, ticket médio e conversão', '', 1),
('Módulo 2 · Time de vendas', 'Aula 1 · Rotina e reunião semanal', '', 2),
('Módulo 3 · Vitrine e experiência', 'Aula 1 · Vitrine que vende', '', 3),
('Módulo 4 · Base de clientes e CRM', 'Aula 1 · Organizando a base', '', 4),
('Módulo 5 · Instagram que vende', 'Aula 1 · Perfil, bio e destaques', '', 5),
('Módulo 6 · Estoque e compras', 'Aula 1 · Curva ABC e queima', '', 6);

insert into public.datas_comerciais (mes, dia, titulo) values
(0, null, 'Liquidação de verão'), (0, null, 'Volta às aulas'),
(1, null, 'Carnaval'),
(2, 8, 'Dia da Mulher'), (2, 15, 'Dia do Consumidor'),
(3, null, 'Páscoa'), (3, null, 'Início do outono'),
(4, null, 'Dia das Mães (2º domingo)'),
(5, 12, 'Dia dos Namorados'), (5, 24, 'São João'),
(6, null, 'Férias'), (6, null, 'Liquidação de inverno'),
(7, null, 'Dia dos Pais (2º domingo)'),
(8, 15, 'Dia do Cliente'), (8, 22, 'Início da primavera'),
(9, 12, 'Dia das Crianças'),
(10, null, 'Black Friday'),
(11, 25, 'Natal'), (11, 31, 'Réveillon');
