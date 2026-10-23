# Hub Loja Magnética

O Hub da empresa e a área do mentorado (PORTAL DA MENTORIA) em um só lugar, no lugar dos portais do Notion.
O visual segue o Escritório Virtual de referência (Geração N), com as cores da Loja Magnética.

- `app/`, `components/`, `lib/`: o aplicativo (Next.js).
- `supabase/migrations/`: o banco de dados (tabelas, segurança e conteúdo inicial).
- `prototipo/index.html`: o protótipo clicável da primeira conversa.

## O que tem

**Mentorado(a)**
- Início com próximo Meet, atalhos e "Tudo aqui na plataforma"
- A jornada de 7 passos, com o Onboarding oficial (Próximos Passos 1 a 10)
- Plano de Ação 90 dias com checklist
- Reuniões com gravação e ata, puxadas sozinhas do Google Agenda
- Personalização em 7 etapas, com a faixa vermelha "falta X de 7"
- Metas e calculadora: meta diária, atendimentos, preço de venda e de queima
- Scripts de venda (12 categorias) já preenchidos com nome da loja, vendedora e Instagram
- PLANEJE AQUI (12 meses, salva sozinho) e Kanban de conteúdo
- **Curso Loja Magnética** (estrutura do Mapa do Curso): Aula 0 com o Raio-X interativo (nota 0/1/2 nos 16 fundamentos, radar por pilar e por onde começar), os 4 módulos com aulas, ferramentas, missão de 7 dias e prova, o bônus Contratar certo e o Manual da loja. Placar Magnético 0/16 e selo por pilar. Só avança quando entrega a prova; o que já funciona no Raio-X não trava a trilha. A prova entregue entra sozinha em "Fundamentos implantados" na ficha da loja
- Notas, gravações dos encontros, Dúvidas (respostas às 10h e às 16h)
- **Assistente Magnética**: o Claude conhece o método e os dados daquela loja
- Modo escuro, letra maior, largura da tela e instalação como app no celular

**Empresa** (só a equipe)
- Painel da empresa: clientes ativas por plano, etapa da jornada, contratos vencendo em 60 dias, termômetros e encontros da semana
- Carteira: a ficha única de cada loja (plano, situação, etapa, termômetro, Resultado Nº 1, fundamentos, CS responsável) e os contratos
- Equipe: quem é da equipe, a função de cada um e o convite por link para pessoas novas
- As clientes vieram do Notion pela regra "vale a versão mais atual" entre a Carteira, Mentorados & Entregas e os portais. Os dados delas ficam só no banco, nunca neste repositório (ele é público)

**Portais**
- Painel com todos os portais: passo da jornada, % do Plano, próxima reunião, último acesso e dúvidas pendentes
- Abrir qualquer portal e ver exatamente o que a mentorada vê
- Criar portal novo e gerar o link de acesso da mentorada, pronto para mandar no WhatsApp
- Editar dados do portal, Plano de Ação, reuniões (gravação e ata) e ver as respostas da Personalização
- Caixa única de dúvidas pendentes
- Biblioteca: scripts, vídeos das aulas e links das ferramentas do curso, modelo do Plano de Ação e textos dos 7 passos, editados uma vez para todos

**Acesso por link:** ao criar o portal (ou em "Quem acessa → Novo link"), o Hub gera um link de uso único que a equipe manda pelo WhatsApp. O link só é usado quando a pessoa clica em "Criar minha senha", então a prévia do WhatsApp não o gasta.

**Segurança:** cada mentorado(a) só enxerga o próprio portal. Isso é garantido pelo banco de dados (RLS), não só pela tela.
Ninguém se cadastra sozinho: só entra quem a equipe convida.

## Onde fica no ar

O Hub é um **site estático** publicado no GitHub Pages deste repositório:
**https://lojamagnetica.github.io/analises/portal/**

- Os dados vêm direto do Supabase pelo navegador. Quem protege tudo são as regras do banco (RLS), testadas em `supabase/migrations/`.
- As operações que precisam da chave de serviço rodam em funções do Supabase (`supabase/functions/`):
  - `acesso`: gera o link de uso único da mentorada (ou, com `equipe: true`, de uma pessoa nova da equipe). Só atende a equipe.
  - `primeiro-acesso`: cria a conta da equipe uma única vez, só para o e-mail autorizado.
- O endereço e a chave pública do Supabase ficam em `lib/config.ts`.

### Publicar uma nova versão
```bash
cd hub
npm install
npm run publicar   # gera o site e copia para ../portal (com ../.nojekyll)
```
Depois é só fazer o commit da pasta `portal/` no `main`. O GitHub Pages atualiza sozinho.

### Primeiro acesso da equipe
Abra https://lojamagnetica.github.io/analises/portal/primeiro-acesso/ e crie a conta com o e-mail autorizado. Isso funciona uma única vez.

### Ainda a ligar
- **Assistente Magnética:** vai rodar numa função do Supabase que chama o Claude. Precisa de uma chave da Anthropic guardada como segredo da função (Supabase → Edge Functions → Secrets).
- **Google Agenda → Reuniões:** vai rodar numa função do Supabase agendada todo dia às 07h05 (Recife). As regras de leitura já estão em `lib/agenda-regras.ts`, com testes: a loja é encontrada pelo **nome no título** do evento (nome da loja ou um apelido do portal); eventos **roxos** (leads do comercial), de dia inteiro e com club/curso/treinamento/semanal/ausente ficam de fora; nada é duplicado.

## Para desenvolver

```bash
cd hub
npm install
npm run dev                  # http://localhost:3000/analises/portal/
npm test                     # regras da agenda
npm run typecheck
```

## Próximas fases

1. **Migrar os portais ativos do Notion** (respostas, Plano de Ação, reuniões e PLANEJE AQUI de cada mentorada).
2. **Gestão de clientes**: base com aniversário, última compra, curva A/B/C e lista de inativas.
3. **Giro de estoque**: subir a planilha do sistema e gerar a Curva ABC e os blocos de queima.
4. Notificações por e-mail/WhatsApp quando a Camilla responder uma dúvida.
