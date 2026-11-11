# Catálogo da Gamificação Brasil

Valores vigentes do programa (podem ser recalibrados pelo painel de custo). Não colocar nomes de lojas nem de clientes aqui.

## O que o Hub mede hoje

| Indicador | Fonte no Hub | Automática? |
|---|---|---|
| Caixa lançado no dia | `loja_caixa` | Sim |
| Meta do mês, % feito e quanto falta | `loja_plano_mes` + `loja_caixa` | Sim |
| Venda, peças, P.A. e ticket por vendedora | `loja_caixa.vendedoras` | Sim |
| Peças por linha e produto vendidos | `loja_caixa_itens` (relatório Lista de Vendas) | Sim |
| Conferência semanal de relatórios | `loja_envios` | Marcada por quem confere |
| Cadastro completo (WhatsApp e aniversário) | `loja_clientes` | Sim |
| Cliente chamada ("Chamei") | `loja_chamar` | Marcada pela pessoa |
| Missão do dia cumprida | `loja_missao_dia` | Marcada pela pessoa |
| Desafio do dia cumprido | `loja_desafios` e `loja_desafio_feitos` | Marcada pela pessoa |
| Atendimentos com resultado e conversão | `loja_vez_atend` | Só nas lojas piloto (Lista da vez) |
| Indicação entre lojas | `loja_vez_atend.indicada_por` | Só nas lojas piloto |

O que o Hub **não** mede: atendimento fora da Lista da vez, presença, limpeza e escala da loja, mensagem enviada de fato (sem print), qualidade do atendimento.

## Pontuação vigente
- Missão do dia no mesmo dia: **10 pontos** (média). Todas as missões do dia: **1 estrela**.
- Desafio do dia: pontos por ação cumprida, definidos por quem lança (modelos prontos: linha parada, P.A. baixo, fluxo baixo, ticket médio, pós-venda, cadastro, livre).
- Semana em dia na Lista da vez (resultado marcado em 80% ou mais, mínimo de 5 atendimentos): **5 estrelas**.
- Indique e ganhe entre lojas (nov e dez): **20 pontos e 5 estrelas**.
- Clientes da semana cadastradas completas: **20 pontos** para quem cadastra (quem cuida do caixa).
- Caixas e relatórios da semana (segunda a sábado + conferência): **20 pontos** para quem cuida do caixa.
- **Destaque da loja** (mais estrelas na loja no mês): R$ 200 e 100 pontos no mês seguinte.
- **Destaque Absoluto Brasil** (mais estrelas entre todas as lojas): mais R$ 200 extra da mentora.
- **Ranking das lojas** (soma dos pontos individuais, só quem bateu a meta; empate entre 2: as duas; mais de 2: as 2 que chegaram primeiro): R$ 200 extra da mentora.
- **Lojinha:** de 100 em 100 pontos por mimos (garrafinha, maquiagem, skincare, brindes das marcas); roupa só pelo **voucher de R$ 500 (500 pontos)**, acumulativo.

## Do desafio da loja à ação (exemplos de mapa)

| Dificuldade típica | Processo | Métrica | Gamificação |
|---|---|---|---|
| Linha parada no estoque | Vitrine e oferta da linha, uma abordagem por dia | Peças da linha vendidas (`loja_caixa_itens`) | Desafio "a cada 2 peças da linha, X pontos" |
| P.A. baixo | Oferta da segunda peça em todo atendimento | P.A. da vendedora no caixa | Desafio "cada venda com 3 peças ou mais" |
| Clientes que sumiram | Lista de resgate do dia, mensagem pronta, janela de 15 dias | Cliente chamada que voltou a comprar | Missão "chamar N clientes" e pontos por cliente que comprou |
| Base incompleta | Cadastro completo em toda venda | % de clientes com WhatsApp e aniversário | Pontos semanais para quem cadastra |
| Caixa e relatório atrasados | Lançar todo dia, conferir toda semana | Dias de caixa de segunda a sábado | Pontos semanais para quem cuida do caixa |
| Time desorganizado | Missão do dia e rotina fixa | Missões cumpridas no mesmo dia | Pontos e estrela do dia |
| Aniversariantes sem ação | Convite na 1ª semana, parabéns no dia, lembrete 5 dias antes do fim | Aniversariante que veio e comprou | Pontos para quem cuida da campanha, com print |
| Fluxo baixo | Mensagem para a carteira, ação de atração | Entrada de clientes e vendas | Desafio de resgate |

## Comprovação por tipo de ação
- **Resgate de cliente:** quem chamou envia o print da conversa; vale se a compra da cliente aconteceu em **até 15 dias** depois da mensagem e foi a própria pessoa quem mandou. Quando a mesma cliente foi chamada por duas pessoas, vale a primeira mensagem comprovada.
- **Aniversariantes:** a pessoa responsável envia print da mensagem (mesmo se usar o número da loja e falar em nome da loja) e vale a compra no mês do aniversário, depois da mensagem.
- **Pós-venda 24 horas:** print com data e hora, comparado com a hora da venda.
- **Indicação entre lojas:** quem recebe a cliente marca quem indicou; venda registrada no caixa; conferência da gestora em amostra; teto de 4 por mês.
- **Cadastro completo e caixa:** o Hub confere campos e dias.
- **Escala e limpeza (quando existir):** foto no horário e conferência da gestora.
- Regra de ouro: sem comprovação definida, a ação não vale ponto.

## Fórmulas de calibração
- **Pontos que cabem no mês** = orçamento do mês ÷ custo do ponto. Sugestão: custo médio de **R$ 0,30 por ponto** (mimos e brindes perto de R$ 0,20; voucher no preço de custo perto de R$ 0,50).
- **Por pessoa por dia** = pontos que cabem ÷ pessoas ÷ dias do mês.
- **Orçamento sugerido:** entre **0,5% e 0,7% do faturamento mensal** da loja (mais os prêmios em dinheiro do programa).
- **Pontuação máxima por pessoa por mês** = soma de todas as regras no melhor cenário. Deve ficar abaixo da capacidade do orçamento; se passar, baixar valores ou colocar teto (desafio por dia, indicação por mês).
- **Retorno esperado** = ganho de P.A. ou resgate × ticket × margem. Usar para justificar o orçamento, sempre como estimativa.
- Acompanhar no painel de custo: custo do mês, projeção do fim do mês, origem dos pontos e % do faturamento.

## Checklist de implantação no Hub
- [ ] Acesso de cada pessoa do time criado (sem repetir pergunta que o diagnóstico já respondeu).
- [ ] Quem cuida do caixa marcado em Gamificação do time.
- [ ] Meta do mês definida no plano (necessária para o ranking Brasil).
- [ ] Orçamento e custo do ponto configurados no painel de custo.
- [ ] Missões do dia lançadas para a primeira semana; desafio do dia escolhido por modelo.
- [ ] Lojinha com mimos e fotos; voucher cadastrado.
- [ ] Avisos no celular ligados em todos os aparelhos.
- [ ] Apresentação da campanha feita com o time (online) e data de largada combinada.
- [ ] Lista da vez: só se a loja for piloto.
- [ ] Revisão de 30 dias agendada com os indicadores e o custo.

## Missão do Mês Brasil: Gestão · Execução · Resultado · Brasil
Índice de **0 a 500 pontos**, com a mesma chance para todas as lojas. Três pilares, e o Brasil é o ranking entre todas as lojas do programa.

**Gestão (130)**
- Caixa da semana lançado até o sábado (80): 20 pontos por semana; até a segunda, 10.
- Planejamento do mês feito e meta cadastrada até o dia 5 (30).
- Feedback individual do time registrado no meio do mês (20).

**Execução (170)**
- Missão da semana enviada todos os dias pelo Hub (80): 20 pontos por semana (10 se mandar em 4 ou 5 dias).
- Mensagens pelo Hub (60): pós-venda em até 24h, aniversariantes e clientes que sumiram, 15 por semana. Print por amostragem.
- Cadastros completos (telefone e aniversário) 20% acima do mês anterior (30).

**Resultado (200)**
- Meta do mês batida, com post e marcação da mentoria (80); sem o post, 40. Comprovação: link do post.
- Crescimento sobre o mesmo mês do ano anterior (40).
- Clientes que sumiram e voltaram a comprar pela mensagem (60). Comprovação: print da conversa e compra em até 15 dias, conferido pela gestora.
- Compartilhar a vitória (20): segundo post, com o **Card de Resultado** gerado no Hub (link ou print). As melhores entram no Card do Mês.

**Brasil:** placar entre todas as lojas. Para concorrer: 350 pontos ou mais. Empate: maior % da meta do mês; depois, quem chegou primeiro. O placar fecha no último dia do mês.
**Prêmios (ainda em definição, não lançados):** 1º lugar, Loja Magnética do Mês: mais 1 mês de programa, destaque no Brasil e 1 livro de gestão escolhido pela mentora e entregue na loja; 2º lugar: 1 encontro individual na hora que a loja quiser; 3º lugar: 1 treinamento individual online para o time.
**Regra:** vale só o que o Hub confere; feito fora do prazo não conta.
