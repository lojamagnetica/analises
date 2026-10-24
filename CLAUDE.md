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
- Textos em português do Brasil, simples e diretos (a usuária principal não é técnica).
- Análises e conteúdos gerados para clientes ficam como rascunho até a Camilla liberar.
- Notion é só leitura.
- Fuso: America/Recife.

## Padrões do código
- Páginas client (`"use client"`), dados com `useDados` de `lib/hub.tsx`, `usePortal()` no portal e `useEquipe()` na equipe.
- Classes prontas em `globals.css`: `card`, `card-borda` (com `--c`), `selo feito|andamento|espera|alerta|erro`,
  `btn p|s peq`, `chips/chip`, `aviso ok`, `ajuda`, `mudo`, `linha entre`, `secao`, `grade g3|g4`.
- Comentários curtos em português, nomes em português.
- Testes de tela: Playwright com Supabase simulado (Chromium já instalado; não rodar `playwright install`).
