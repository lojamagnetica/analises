---
name: linha-de-gestao
description: Linha de gestão da Camilla (Loja Magnética) para todo texto do Hub que fala com o time da loja ou ensina a dona a falar com ele: feedback, cobrança, reunião, pauta, roteiro, leitura da semana, treinamento. Use sempre que escrever ou revisar esses textos.
---

# Linha de gestão: auto-responsabilidade e maturidade do time

Tudo o que o Hub coloca na boca da gestora (feedback, cobrança, reunião, pauta, leitura, treino) segue esta linha.

## A regra da fala
- **Sempre na segunda pessoa, com a responsabilidade com a pessoa.** "Você está vendendo as peças mais baratas", nunca "as clientes estão levando as peças mais baratas". "Você está vendendo, mas a cliente sai com uma peça só", nunca "a gente está vendendo uma peça só". Quem muda o número é ela.
- Com número, sobre um fato. Sem "sempre", "nunca", "todo mundo".
- No particular, com respeito. Corrige no particular, reconhece na frente do time.

## A ordem do feedback (sempre estes 5 passos)
1. **O problema, com número.** "Bruna, você está vendendo as peças mais baratas: o seu preço médio é R$ X, e o do estoque é R$ Y."
2. **O que ela já faz bem e a vantagem do perfil.** Pontua o que já funciona ("a cliente já leva mais de uma peça com você") e a força do perfil para usar na solução. Ex.: Protagonista tem poder de influência; Influente cria conexão; Constante passa confiança; Analista conhece o produto em detalhe.
3. **A solução, demonstrada na prática.** A gestora mostra, não só fala. Ex.: pega uma peça que ela vende muito e mostra qual seria a outra opção, com valor um pouco maior, que ela poderia ter oferecido, e como argumentaria.
4. **A dificuldade de execução.** "O que pode te atrapalhar de fazer isso? Do que você precisa?" Se a resposta for "não sei fazer", vira treino (eu faço, fazemos juntos, você faz e eu vejo, você faz sozinha).
5. **O combinado sai dela.** "O que você vai fazer, quanto e até quando?" A gestora combina como vai acompanhar.

## Preço médio: com quem comparar
- Cada vendedora é comparada com o **preço médio de venda da própria loja no mês** (faturamento ÷ peças): aparece só quem está bem abaixo do geral (10% ou mais).
- O **preço médio do estoque** mostra se existe um **padrão da loja** (o time todo vendendo abaixo do estoque). Aí o aviso é para a loja, não para uma pessoa.
- Sem estoque preenchido, vale só a comparação com a loja.

## Onde isso está no código
- `hub/lib/meu-dia.ts` → `feedback()` (Feedback pronto do Início, 5 passos) e `SITUACOES`.
- `hub/lib/pessoas.ts` → `VANTAGEM` (força de cada perfil) e `roteiroCobranca()` (Dar retorno).
- `hub/lib/reunioes-modelo.ts` → reunião individual (mesma ordem) e reuniões do time.
- Textos do método no banco: `metodo` (chave `pessoas`), modelos `cobranca_*` (migração 0071).

## Ao construir algo novo no Hub
Qualquer fala para o time ou roteiro para a gestora: segunda pessoa, número, os 5 passos e o combinado vindo da pessoa. Reuniões em grupo podem usar "nós" para o resultado da loja, mas cada pessoa fala o número dela.
