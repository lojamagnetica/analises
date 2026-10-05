# Hub Loja Magnética

Hub da empresa e área do mentorado (PORTAL DA MENTORIA) em um só lugar, substituindo os portais no Notion.

`index.html` é um **protótipo clicável** com dados de exemplo. Ele salva o que você mexe só no seu navegador. Ainda não tem login nem banco de dados.

## Referência analisada: Geração N · Escritório Virtual

| Área do Geração N | O que tem | No Hub Loja Magnética |
|---|---|---|
| Início | Atalhos + "Tudo aqui na plataforma" | Início com próximo Meet, progresso da jornada e do Plano |
| ReNata (IA) | Assistente que usa as respostas da personalização | **Assistente Magnética** (Claude) com Personalização, Plano e método |
| Personalização / Meus testes | 7 questionários; banner "falta X de 7" | 7 etapas: diagnóstico, tom de voz, cliente ideal, mix, time, metas, canais |
| Scripts | Cards por categoria (boas-vindas, objeções, follow-up…) | Scripts para loja de moda, já preenchidos com os dados da loja |
| Meu Negócio | Clientes, Funil, Agenda, Financeiro, Notas | Metas e calculadora, Notas; Clientes e Giro de estoque na fase 2 |
| Comercial | CRM, Link de pagamento, Calculadora, Scripts de venda | Calculadora de meta diária e preço; CRM na fase 2 |
| Ferramentas | Formulários, Link da Bio, Radar, Kanban, WhatsApp (em breve) | PLANEJE AQUI, Kanban de conteúdo, Análise do perfil |
| Cursos | Área de aulas | Cursos e gravações dos encontros |
| — | (não tem) | **Jornada de 7 passos, Plano de Ação 90 dias, Reuniões, Dúvidas 10h/16h** |
| — | (não tem) | **Visão da equipe**: painel de todos os portais, dúvidas, agenda, novo portal, biblioteca |

## Fases sugeridas

1. **Fundação**: login (mentorado e equipe), banco de dados, portal com jornada, Plano de Ação, Reuniões, PLANEJE AQUI, Kanban, Notas, Scripts e Personalização. Importar os portais ativos do Notion.
2. **Inteligência**: Assistente com Claude; sincronização automática Google Agenda → Reuniões; Dúvidas com rascunho de resposta.
3. **Gestão da loja**: Gestão de clientes (aniversário, inativas, curva A/B/C), Giro de estoque (upload da planilha → Curva ABC), CRM.
4. **Extras**: app no celular (PWA), formulários, link da bio, cursos hospedados.

Stack proposta: Next.js + Supabase (login, banco e arquivos) na Vercel, com a API do Claude para o Assistente.
