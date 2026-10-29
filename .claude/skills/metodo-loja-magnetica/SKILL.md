---
name: metodo-loja-magnetica
description: Regras fixas do Método Loja Magnética (da Camilla) para tudo o que o Hub cria ou responde sobre cliente, CRM, pós-venda, mensagens, missões, réguas, leituras e conteúdos. Use sempre que escrever mensagens para clientes, modelos de CRM, sugestões de ação ou textos que ensinam a loja a se relacionar com a cliente.
---

# Método Loja Magnética: regras fixas

Estas regras valem para toda resposta, criação e texto do Hub. A linha de gestão (como falar com o time) está na skill `linha-de-gestao`.

## Pós-venda: o carimbo de conexão
- O pós-venda acontece **em até 24 horas depois do atendimento**. É o carimbo de conexão com a cliente.
- **Não oferece nada.** A cliente ainda está conectada à consultora pelo excelente atendimento: o objetivo é ela **responder e salvar o número** da consultora, e aí começa a fidelização.
- A próxima tentativa de venda vem **dentro dos 30 dias seguintes** (segunda compra), quando já existiu o contato de cuidado.
- **Ser interessante antes de ser interesseiro.**
- Modelo: "Oi, {nome}! Aqui é {consultora}, da {loja}. Foi muito bom te atender! 💛 Este é o meu WhatsApp: salva aí, que qualquer coisa que você precisar, um ajuste, uma troca ou uma dica de como usar a peça, é só me chamar."

## Aniversariantes do mês
- O presente (ex.: x% de desconto nas compras) **vale o mês inteiro** do aniversário.
- **Dia 25 do mês anterior:** a gestora puxa no sistema as aniversariantes do mês seguinte e divide pela carteira de cada vendedora.
- **3 mensagens, da consultora para a própria carteira:**
  1. **Convite na primeira semana do mês**, para todas as aniversariantes do mês. Modelo da Camilla: "Oi, {nome}! Aqui é {consultora}. Este é o mês do seu aniversário, e nós da {loja} preparamos um presente especial para você: durante todo o mês do seu aniversário, você recebe {x% de desconto} nas suas compras aqui na loja. Já vamos escolher o look do seu dia? Será um privilégio te ajudar nessa escolha."
  2. **No dia do aniversário: só o parabéns.** Sem falar do presente e sem tentar vender: no dia chegam muitas mensagens e a dela se perde.
  3. **Lembrete faltando 5 dias para o presente expirar.**
- Está no cronograma de todas as lojas: Planner de gestão (dia 1 e dia 25), rotina do Início (primeira semana, dia do aniversário, 5 dias antes do fim, dia 25) e rotina da loja.
- Regras de envio: só para cliente cadastrada; se pedir para não receber, sai da lista na hora; texto curto da própria consultora, sem corrente; responder toda mensagem no mesmo dia.

## Toda mensagem para a cliente
- A consultora se apresenta: "Aqui é {consultora}, da {loja}". Nunca só o nome da loja.
- O CRM é **acompanhado e direcionado pela gestora** e **executado 100% pela equipe**. Cada pessoa cuida e mantém ativa a própria carteira.

## Força de venda unificada
- Toda semana, uma missão igual para o time todo (resgate, lançamento, ação de uma linha, melhores clientes, pós-venda, segunda compra, aniversariantes), com o mesmo modelo de mensagem e a mesma meta de mensagens por pessoa. A gestora acompanha o que cada uma mandou, quem respondeu e quem comprou.
- A lista de clientes sai do sistema da loja (a carteira de cada vendedora).

## Onde isso está no código
- `hub/lib/missoes.ts` (missão da semana), `hub/lib/clientes.ts` (mensagens dos tipos de cliente), `hub/lib/site.ts` (régua do site),
  `hub/lib/varejo.ts` (contatos padronizados), banco `metodo` chaves `clientes` e `leitura_agente` (migração 0073).
