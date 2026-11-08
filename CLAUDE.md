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
- Todo pedido de arquivo para a loja tem também um espaço para responder à mão (pode ser estimativa) ou marcar "Ainda não tenho". Nada trava por falta de arquivo.
- Análises e conteúdos gerados para clientes ficam como rascunho até a Camilla liberar.
- Nunca perguntar à loja o que ela já respondeu (formulário, áudios, reuniões, arquivos, Hub). Todo agente procura a resposta no material antes de perguntar; se está em parte, pergunta só o que falta, no formato "Entendi que você já faz X, porém ainda preciso entender melhor Y". Pergunta repetida soa como desorganização.
- Roteiros de gravação da Camilla: sempre em formato de teleprompter (só as falas, frases curtas, um bloco por respiração). No Hub, as falas ficam em linhas com "> " para o Teleprompter do Meu estúdio.
- Notion não é mais usado (desde 08/11/2026): nada se lê nem se grava no Notion. Tudo fica no Hub.
- Áreas do portal liberadas por etapa: as áreas novas nascem com cadeado (`portais.menu_trancado`; hoje `conteudo` e `marca`) e a Camilla libera uma área coerente com a etapa da loja a cada 15 dias, sempre bem feita antes de abrir.
  - "Nossa marca" (Nossa história + Guia das marcas) abre na semana depois do Diagnóstico.
- Rotina de gestão = Planner de gestão (`/consultoria/planner`, no lugar da antiga Bússola), montado com os dias que a loja responde em Dados da loja › Gestão da loja:
  - No mês: estratégia do mês seguinte (até o dia 20) e análise do mês que fechou + reunião do mês com o time; feedback individual no meio do mês.
  - Na semana: dia da análise de resultado (time, marcas e produtos, Instagram, vitrine e revisão do plano), conversa individual, VM geral, conteúdo e gravações, missão da semana, compras; dia do conhecimento só para quem tem equipe e passou dos 3 meses.
  - As demandas do dia aparecem em "Sua rotina de hoje" (Meu dia) quando o planner é liberado.
- Plano de Ação mês a mês (norteia a satisfação da cliente):
  - Os desejos vêm SEMPRE das palavras da própria cliente: loja que subimos do Drive = formulário "Diagnóstico da Sua Loja" (planilha de respostas no Drive); loja que entrou direto pelo portal = as respostas dela no Hub. Nunca do resumo do Comercial, do Raio-X ou de outro agente. Citar a pergunta e a resposta de onde saiu cada desejo.
  - Os desejos que ela listou primeiro (objetivos em ordem de prioridade e o que quer construir) entram nos 2 primeiros meses depois da entrega do portal.
  - Todo mês tem uma correção de gestão e processos e pelo menos um impulsionador de resultado. O título do mês segue "Correção: … · Impulsionador: …".
  - Meta do mês pela regra do método (mesmo mês do ano anterior +20%), salvo número que a própria cliente deu.
- Contrato de Foco (padrão da Luciana, vale para toda loja com Diagnóstico liberado), na ficha da loja:
  - `foco_curto`: uma linha (até 90 caracteres) para o Início, logo abaixo do nome. Ex.: "Faturar R$ 30 mil por mês com as vendas registradas no Hub".
  - `resultado_n1`: uma frase completa (até ~175 caracteres) com o resultado e o prazo de 90 dias, tirada do foco do Diagnóstico.
  - `indicador`: "início · hoje · meta", com os números do Diagnóstico.
  - `fundamentos_trabalhando`: os 4 fundamentos ligados ao foco. "Implantado" só o que a loja de fato já faz.
  - O Início mostra só o resumo e o "de acordo"; o Diagnóstico mostra o contrato completo. Mudar o resultado ou o indicador pede o de acordo de novo.
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
