# magnética.hub · como trabalhar neste repositório

Repositório PÚBLICO. Nunca commitar dados de clientes (nomes de lojas, respostas, análises, telefones),
senhas, chaves ou tokens. Dados de clientes ficam só no Supabase.

## O que é
- `hub/`: o Hub da Loja Magnética (Next.js 16, export estático, React 19, TypeScript). Substitui o Notion.
  - Portal da loja (mentoria e consultoria): `hub/app/(hub)/*` fora de `equipe/` e `empresa/`.
  - Hub da equipe/empresa: `hub/app/(hub)/equipe/**` e `hub/app/(hub)/empresa/**`.
  - Lógica e acesso ao banco em `hub/lib/*.ts`; componentes em `hub/components/`.
- `portal/`: o site publicado (GitHub Pages em `/analises/portal`). É GERADO, nunca editar à mão.
- Banco: Supabase (RLS com `is_equipe()`, `meu_portal()`, `pode_ver(portal_id)`). Migrações em `hub/supabase/migrations/NNNN_nome.sql`.

## Fluxo
1. Trabalhar no branch da sessão. Antes de começar e antes de publicar: `git fetch origin main && git merge origin/main`.
2. `cd hub && npx tsc --noEmit` precisa passar.
3. Publicar: `cd hub && npm run publicar` (reconstrói `portal/` inteiro), commit de `hub/` + `portal/`, PR para `main`, merge.
4. Conflito dentro de `portal/`: não resolver arquivo por arquivo. Fazer o merge do `main`, rodar `npm run publicar` de novo e commitar o resultado.

## Duas sessões em paralelo
Às vezes uma sessão cuida do portal da loja e outra do Hub da equipe ao mesmo tempo.
- Cada uma mexe na sua área (lista acima). Arquivos comuns (`components/Menu.tsx`, `app/globals.css`, `lib/hub.tsx`,
  `app/(hub)/layout.tsx`): mudanças pequenas e pontuais, sem reformatar nem reorganizar o arquivo.
- Migração nova: olhar o maior número já existente no `main`. Se colidir no merge, renomear a sua para o próximo número livre.
- Sempre publicar a partir de um branch que já tem o `main` mais recente; senão o site volta a uma versão antiga.

## Supabase pelo MCP
- `apply_migration` costuma estourar o tempo: aplicar com `execute_sql` em blocos pequenos, com `set lock_timeout='8s';` no começo.
- SQL com DELETE fica esperando confirmação da Camilla: evitar; pedir antes quando for inevitável.
- Escrever o mesmo SQL aplicado no arquivo de migração do repositório.

## Regras da marca e do negócio
- Nome: Loja Magnética / magnética.hub. Nunca "LDS", "Loja de Sucesso" ou "PORTAL DA MENTORIA". Sem "(a)" genérico, sem 🥂.
- Nunca usar o termo "balcão" (remete a loja popular). Usar "loja", "atendimento", "salão" ou "dia a dia da loja".
- Textos em português do Brasil, simples e diretos (a usuária principal não é técnica).
- Tudo o que a loja cadastra no Hub (pessoas, clientes, lançamentos, notas, arquivos) precisa ter **editar e excluir/remover**:
  a lojista pode errar ou precisar tirar alguém. Excluir sempre com confirmação.
- Análises e conteúdos gerados para clientes ficam como rascunho até a Camilla liberar.
- Nunca perguntar à loja o que ela já respondeu (formulário, áudios, reuniões, arquivos, Hub). Todo agente procura a resposta no material antes de perguntar; se está em parte, pergunta só o que falta. Pergunta repetida soa como desorganização.
- Roteiros de gravação da Camilla: sempre em formato de teleprompter (só as falas, frases curtas, um bloco por respiração). No Hub, as falas ficam em linhas com "> " para o Teleprompter do Meu estúdio.
- Notion é só leitura.
- Retorno do teste de perfil para a equipe: Relatório de Perfil Comportamental (página com a marca, tom profissional, link curto no WhatsApp).
  Os pontos de desenvolvimento falam do jeito do perfil, nunca da pessoa, para ela refletir sem se sentir apontada. Textos em `hub/lib/perfil-pessoa.ts`.
- Fuso: America/Recife.

## Linha de gestão (feedback, cobrança, reuniões, roteiros para o time)
Diretriz da Camilla: auto-responsabilidade e maturidade do time. Detalhes em `.claude/skills/linha-de-gestao/SKILL.md`.
- Fala sempre na segunda pessoa, com a responsabilidade com a pessoa: "você está vendendo as peças mais baratas", nunca "as clientes estão levando".
- Ordem do feedback: 1) o problema, com número; 2) o que ela já faz bem e a força do perfil; 3) a solução demonstrada na prática (ex.: uma peça que ela vende muito e a opção de valor maior que poderia ter oferecido, e como argumentar); 4) a dificuldade de execução; 5) o combinado sai dela (o quê, quanto, até quando).
- Vale para tudo o que for construído no Hub que fala com o time ou ensina a dona a falar com ele.

## Regras do método (cliente e CRM)
Detalhes em `.claude/skills/metodo-loja-magnetica/SKILL.md`. Valem para toda resposta e criação do Hub.
- Pós-venda é o carimbo de conexão: em até 24 horas depois do atendimento, sem oferecer nada. O objetivo é a cliente responder e salvar o número da consultora. A próxima tentativa de venda vem dentro de 30 dias. Ser interessante antes de ser interesseiro.
- Aniversariantes do mês: o presente vale o mês inteiro; convite na primeira semana do mês para todas; no dia, só o parabéns (não é hora de vender); lembrete faltando 5 dias para expirar. Lista puxada pela gestora no dia 25 do mês anterior. Está no cronograma de todas as lojas.
- Toda mensagem para a cliente diz quem fala: "Aqui é {consultora}, da {loja}".
- CTA no CRM conduz, não pergunta: nada de "posso?", "quer ver?", "se quiser". Duas opções que levam ao próximo passo: "te mando as fotos ou você já consegue vir na loja ver tudo e provar?".
- CRM direcionado pela gestora e executado pela equipe, cada pessoa com a sua carteira; missão da semana igual para o time todo.

- Linguagem da cliente em tudo o que o Hub cria: palavras do dia a dia, nada rebuscado ("refino", "composição").
- Nossa história: o agente monta o storytelling sem mudar fatos e sem expor o que não é para a equipe (dificuldade financeira atual, desabafos); rascunho até a Camilla aprovar.

## Padrões do código
- Páginas client (`"use client"`), dados com `useDados` de `lib/hub.tsx`, `usePortal()` no portal e `useEquipe()` na equipe.
- Classes prontas em `globals.css`: `card`, `card-borda` (com `--c`), `selo feito|andamento|espera|alerta|erro`,
  `btn p|s peq`, `chips/chip`, `aviso ok`, `ajuda`, `mudo`, `linha entre`, `secao`, `grade g3|g4`.
- Comentários curtos em português, nomes em português.
- Testes de tela: Playwright com Supabase simulado (Chromium já instalado; não rodar `playwright install`).
