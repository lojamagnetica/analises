---
name: gamificacao-brasil
description: Processo e agente da Gamificação Brasil da Loja Magnética. Use sempre DEPOIS do diagnóstico e do plano de ação de uma loja: lê o cenário e os principais desafios no Hub, transforma cada dificuldade em processo estruturado, define o que será metrificado, monta o Plano de Gamificação da loja (missões, desafios, pontos, estrelas, comprovação, orçamento) e termina sempre com a entrada da loja no ranking Brasil. Usa só o Hub; a Lista da vez fica de fora das lojas que não são piloto.
---

# Gamificação Brasil da Loja Magnética

Repositório PÚBLICO: nunca escrever nome de loja, de cliente ou número real de cliente neste arquivo nem em arquivos do repositório. Dados de cada loja ficam só no Supabase.

## Para que serve
Depois do **diagnóstico** e do **plano de ação**, transformar cada dificuldade da loja em um **processo bem estruturado**, medido pelo Hub, que o time cumpre todo dia porque **ganha ponto por cumprir**. O resultado final sempre entra no **ranking Brasil** do Programa Loja Magnética.

Princípios (da Camilla):
- O time **quer** e **consegue**. A campanha mostra isso com número.
- Recebeu a missão, cumpre. Ninguém precisa cobrar. Loja altamente gerenciável.
- Tudo o que será metrificado é definido **antes**, de acordo com o que vamos implantar. O que não está no Hub não vale ponto.
- Custo controlado: a campanha nunca vira peso mensal para a dona.

## Quando usar
Sempre que uma loja concluir o diagnóstico e o plano de ação (Contrato de Foco com resultado e indicador), ou quando a dona pedir para "engajar o time", "fazer o time usar o Hub", "premiar o time".

## Entradas: ler no Hub, nunca perguntar de novo
Antes de qualquer pergunta, procurar a resposta no material (regra da casa: pergunta repetida soa desorganização). Se está em parte, perguntar só o que falta: "Entendi que você já faz X, porém ainda preciso entender melhor Y".
- **Contrato de Foco e fundamentos:** tabela `fichas` (`foco_curto`, `resultado_n1`, `indicador`, `fundamentos_trabalhando`).
- **Diagnóstico:** `loja_diagnostico.dados` (respostas da cliente, gargalo, alavanca rápida).
- **Plano de Ação mês a mês:** `plano_itens` (`mes`, `texto`, `feito`) e o plano do mês em `loja_plano_mes` (meta por canal, base, crescimento).
- **Números reais:** `loja_caixa` (faturamento, vendas, peças, vendedoras), `loja_caixa_itens` (produto, quantidade), `loja_clientes` (cadastro, última compra), `loja_estoque`.
- **Estrutura:** `portais` (`lojas`, `sem_equipe`, `venda_diaria`, `menu_oculto`), `loja_equipe` (pessoas, função, loja) e os perfis de acesso.
- Os desejos e os desafios vêm **das palavras da própria cliente** (formulário do diagnóstico, áudios, reuniões), nunca de resumo de outro agente. Citar pergunta e resposta.

## O processo em 8 passos

**1. Ler o cenário (3 a 5 números).** Faturamento do mês contra a meta, P.A., ticket médio, quantas vendas por dia, cadastro de clientes completo, clientes sem comprar há mais de 90 dias, tamanho do time. Sem opinião: só número e a fonte.

**2. Eleger os 3 principais desafios.** Do diagnóstico e do plano de ação, na ordem do que mais move o resultado do foco de 90 dias. Cada desafio: uma frase simples, o número que prova e de onde veio.

**3. Transformar cada desafio em processo.** Para cada um, preencher a ficha:

| Campo | O que escrever |
|---|---|
| Dificuldade | Em palavras da cliente. |
| Processo | Passo a passo curto: quem faz, quando, onde no Hub. Rotina diária ou semanal, nunca "quando der". |
| O que será medido | Um número que o Hub já lê (ver `catalogo.md`). |
| Ação de gamificação | Missão do dia, desafio do dia ou meta da semana, com a pontuação. |
| Comprovação | Como saber que foi cumprido (automática, print ou conferência). |
| Quem cobra | A gestora; a cobrança é do número, não da pessoa. |

**4. Montar o Plano de Gamificação da loja** (modelo no fim deste arquivo). Rascunho até a Camilla liberar.

**5. Calibrar pontos e custo** (fórmulas em `catalogo.md`). Orçamento do mês ÷ custo do ponto = pontos que cabem no mês; dividir por pessoa e por dia; conferir contra a pontuação máxima possível. Se estourar, baixar valores ou colocar teto antes de lançar.

**6. Implantar no Hub** (checklist em `catalogo.md`): acesso de cada pessoa, missões, desafio do dia, quem cuida do caixa, lojinha de resgate com fotos, avisos no celular, orçamento no painel de custo. Treinamento curto com a apresentação da campanha.

**7. Metrificar.** Fixar o painel dos 30 dias e as metas (ex.: missões cumpridas no mesmo dia, caixa de segunda a sábado, cadastro completo, indicador do Contrato de Foco). Revisão na reunião semanal de gestão.

**8. Entrar no Brasil.** Todo plano termina com a loja no ranking Brasil do Programa Loja Magnética:
- Pontos individuais somam para a loja; a loja concorre ao prêmio mensal entre as lojas se bateu a meta do mês.
- Estrelas contam para o **Destaque da loja** e para o **Destaque Absoluto Brasil**.
- Dar à loja a data da largada, o calendário (largada, rotina, sprint de datas fortes) e quem lança os desafios.

## Lista da vez: só lojas piloto
A Lista da vez roda hoje em no máximo duas lojas piloto. **Nas demais lojas, não usar.** Trocar por:
- **Venda por vendedora no caixa** (`loja_caixa.vendedoras`): meta do dia, P.A. e ticket médio por pessoa, sem registrar atendimento.
- Missões e desafios do dia no mesmo formato (o link pessoal só existe com a Lista da vez; nas demais lojas, a missão é conferida na tela do Hub e no aviso do celular).
- Atendimentos e conversão: dizer com clareza que **não serão medidos** nessa loja enquanto a Lista da vez não for liberada. Nunca prometer pontos por algo que o Hub não lê.

## Cumprimento: como garantir que eles cumpram
- **Ritmo fixo:** placar toda segunda; reconhecimento do destaque todo mês; revisão de 30 dias.
- **Sinal de alerta (gestora olha todo dia):** missão não cumprida 3 dias seguidos, caixa sem lançar, semana abaixo de 80% de registro, desafio sem uma marcação. Resposta: conversa individual na linha de gestão (problema com número, o que ela já faz bem, solução demonstrada, dificuldade, combinado que sai dela).
- **Nunca cobrar a pessoa, cobrar o número.** O time se motiva por reconhecimento público e pelo prêmio; a cobrança vem do placar.
- Nenhuma ponto vale sem a comprovação definida no plano. Erro de marcação se corrige com a gestora, sem drama; marcação falsa perde os pontos da semana.

## Comprovação: o que precisa ser checado
Detalhe e exemplos em `catalogo.md`. Resumo:
- **Automática (o Hub confere):** caixa lançado, cadastro completo, meta, P.A. e ticket do dia, peças de uma linha.
- **Com print e janela de tempo:** resgate de cliente (mensagem enviada pela própria pessoa até 15 dias antes da compra), aniversariante que veio por causa da mensagem, pós-venda em 24 horas.
- **Conferência da gestora (amostra):** indicação entre lojas, escala do dia, qualquer missão sem dado.

## Regras da marca e do negócio
- Português do Brasil, simples. Nunca "balcão". Nunca "LDS", "Loja de Sucesso" ou "PORTAL DA MENTORIA". Sem "(a)" genérico, sem 🥂.
- Notion não é mais usado. Tudo fica no Hub.
- Tudo o que a loja cadastra tem **editar e excluir**, com confirmação.
- Mensagem para a cliente diz quem fala ("Aqui é {consultora}, da {loja}") e conduz com duas opções, sem "posso?" ou "quer ver?". Detalhes na skill `metodo-loja-magnetica`.
- Feedback e cobrança para o time seguem a skill `linha-de-gestao` (segunda pessoa, número primeiro, força do perfil, solução na prática, combinado que sai dela).
- Conteúdo gerado para cliente fica como rascunho até a Camilla liberar.
- Fuso America/Recife.

## Formato de saída: Plano de Gamificação da loja (rascunho)
1. **Cenário** (números e fonte).
2. **Três desafios** e, para cada um, a ficha do passo 3.
3. **Pontuação** da loja (tabela com valores, tetos e comprovação) e **orçamento** do mês (R$ por mês, custo do ponto, pontos que cabem por pessoa por dia, projeção).
4. **O que será metrificado** nos 30 dias, com a meta de cada indicador.
5. **Implantação no Hub** (checklist marcado) e quem faz cada item.
6. **Entrada no Brasil** (data de largada, calendário, prêmios do programa) e a primeira revisão.
7. **O que fica de fora** (ex.: Lista da vez) e o porquê, em uma linha.

Antes de entregar, conferir: cada pontuação tem um número do Hub por trás; o custo cabe no orçamento; a comprovação está definida; a loja termina inscrita no Brasil.
