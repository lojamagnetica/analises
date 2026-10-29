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
- O presente (ex.: % de desconto em uma compra ou um brinde) **vale o mês inteiro** do aniversário.
- **Dia 25 do mês anterior:** a gestora puxa no sistema os aniversariantes do mês seguinte e divide pela carteira de cada vendedora (cliente sem consultora: rodízio, e passa a ser da carteira de quem recebeu).
- **3 mensagens, da consultora para a própria carteira:**
  1. **Convite no dia 1 do mês, até 12h**, para todas as aniversariantes do mês.
  2. **Parabéns no dia do aniversário, pela manhã.** Quem já usou o presente recebe só o parabéns.
  3. **Lembrete 5 dias antes do fim do mês**, só para quem ainda não usou.
- Na loja: conferir a data no sistema, entregar na embalagem de presente e atualizar o cadastro.
- Regras de envio: só para cliente cadastrada; se pedir para não receber, sai da lista na hora; texto curto da própria consultora, sem corrente; responder toda mensagem no mesmo dia.
- A gestora acompanha: convites enviados no dia 1, parabéns de cada dia, lembretes, taxa de resgate (compraram ÷ aniversariantes) e o resultado por consultora.

## Toda mensagem para a cliente
- A consultora se apresenta: "Aqui é {consultora}, da {loja}". Nunca só o nome da loja.
- O CRM é **acompanhado e direcionado pela gestora** e **executado 100% pela equipe**. Cada pessoa cuida e mantém ativa a própria carteira.

## Força de venda unificada
- Toda semana, uma missão igual para o time todo (resgate, lançamento, ação de uma linha, melhores clientes, pós-venda, segunda compra, aniversariantes), com o mesmo modelo de mensagem e a mesma meta de mensagens por pessoa. A gestora acompanha o que cada uma mandou, quem respondeu e quem comprou.
- A lista de clientes sai do sistema da loja (a carteira de cada vendedora).

## Onde isso está no código
- `hub/lib/missoes.ts` (missão da semana), `hub/lib/clientes.ts` (mensagens dos tipos de cliente), `hub/lib/site.ts` (régua do site),
  `hub/lib/varejo.ts` (contatos padronizados), banco `metodo` chaves `clientes` e `leitura_agente` (migração 0073).
