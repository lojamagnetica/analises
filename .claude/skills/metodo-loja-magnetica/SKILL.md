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

## Toda mensagem para a cliente
- A consultora se apresenta: "Aqui é {consultora}, da {loja}". Nunca só o nome da loja.
- O CRM é **acompanhado e direcionado pela gestora** e **executado 100% pela equipe**. Cada pessoa cuida e mantém ativa a própria carteira.

## Força de venda unificada
- Toda semana, uma missão igual para o time todo (resgate, lançamento, ação de uma linha, melhores clientes, pós-venda, segunda compra, aniversariantes), com o mesmo modelo de mensagem e a mesma meta de mensagens por pessoa. A gestora acompanha o que cada uma mandou, quem respondeu e quem comprou.
- A lista de clientes sai do sistema da loja (a carteira de cada vendedora).

## Onde isso está no código
- `hub/lib/missoes.ts` (missão da semana), `hub/lib/clientes.ts` (mensagens dos tipos de cliente), `hub/lib/site.ts` (régua do site),
  `hub/lib/varejo.ts` (contatos padronizados), banco `metodo` chaves `clientes` e `leitura_agente` (migração 0073).
