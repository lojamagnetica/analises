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
- Notas, Cursos e gravações, Dúvidas (respostas às 10h e às 16h)
- **Assistente Magnética**: o Claude conhece o método e os dados daquela loja
- Modo escuro, letra maior, largura da tela e instalação como app no celular

**Equipe**
- Painel com todos os portais: passo da jornada, % do Plano, próxima reunião, último acesso e dúvidas pendentes
- Abrir qualquer portal e ver exatamente o que a mentorada vê
- Criar portal novo e enviar o convite por e-mail em um clique
- Editar dados do portal, Plano de Ação, reuniões (gravação e ata) e ver as respostas da Personalização
- Caixa única de dúvidas pendentes
- Biblioteca: scripts, aulas, modelo do Plano de Ação e textos dos 7 passos, editados uma vez para todos

**Segurança:** cada mentorado(a) só enxerga o próprio portal. Isso é garantido pelo banco de dados (RLS), não só pela tela.
Ninguém se cadastra sozinho: só entra quem a equipe convida.

## Como colocar no ar (uma vez só)

### 1. Supabase (banco de dados e login)
1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (região São Paulo).
2. Em **SQL Editor**, cole o conteúdo de `supabase/migrations/0001_estrutura.sql` e clique em **Run**. Depois faça o mesmo com `0002_conteudo.sql`.
3. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
4. Em **Authentication → URL Configuration**:
   - **Site URL**: o endereço do Hub (ex.: `https://hub.lojamagnetica.com.br`)
   - **Redirect URLs**: adicione `https://hub.lojamagnetica.com.br/**`
5. Em **Authentication → Emails → Templates**, troque o link de três modelos:
   - **Invite user**: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Aceitar convite</a>`
   - **Magic Link**: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/conta">Entrar no Hub</a>`
   - **Reset Password**: `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Criar nova senha</a>`
6. O e-mail padrão do Supabase manda poucas mensagens por hora. Para convidar várias mentoradas, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**. O Resend, por exemplo, tem plano gratuito.
7. Crie a sua conta: **Authentication → Users → Add user**, com o seu e-mail e uma senha. Depois, no **SQL Editor**, rode:
   ```sql
   update public.perfis set papel = 'equipe', nome = 'Camilla Ribeiro'
   where email = 'seu-email@exemplo.com';
   ```
   Repita para cada pessoa da equipe.

### 2. Vercel (onde o site fica no ar)
1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o GitHub.
2. **Add New → Project**, escolha este repositório e, em **Root Directory**, selecione `hub`.
3. Em **Environment Variables**, cadastre as variáveis do arquivo `.env.example`. Os valores do Supabase estão em **Project Settings → API**.
4. Clique em **Deploy**. Depois, em **Settings → Domains**, ligue o domínio (ex.: `hub.lojamagnetica.com.br`).

### 3. Assistente Magnética (Claude)
1. Em [console.anthropic.com](https://console.anthropic.com), crie uma chave em **API Keys** e coloque créditos.
2. Cadastre a chave na Vercel como `ANTHROPIC_API_KEY`.

O custo é por uso. Cada pergunta manda as instruções do método e os dados da loja; a parte repetida fica em cache e sai mais barata.

### 4. Google Agenda → Reuniões
1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto e ative a **Google Calendar API**.
2. Em **IAM → Service Accounts**, crie uma conta de serviço e gere uma chave **JSON**.
3. Na Vercel, cadastre `GOOGLE_SERVICE_ACCOUNT_EMAIL` (o `client_email` do JSON) e `GOOGLE_PRIVATE_KEY` (o `private_key`).
4. No Google Agenda de `suportelojamagnetica@gmail.com`, abra **Configurações da agenda → Compartilhar com pessoas específicas**, adicione o e-mail da conta de serviço com **Ver todos os detalhes dos eventos**.
5. Cadastre também `CRON_SECRET` (qualquer texto longo). A sincronização roda sozinha todo dia às 07h05 (Recife) e também pelo botão **Sincronizar agora** em Equipe → Reuniões.

Regras da sincronização: a loja é encontrada pelo **nome no título** do evento (nome da loja ou um dos apelidos do portal). Eventos **roxos** (leads do comercial), de dia inteiro e com club/curso/treinamento/semanal/ausente ficam de fora. Nada é duplicado e nenhuma linha existente é alterada.

## Para desenvolver

```bash
cd hub
npm install
cp .env.example .env.local   # preencha os valores
npm run dev                  # http://localhost:3000
npm test                     # regras da agenda
npm run typecheck
```

## Próximas fases

1. **Migrar os portais ativos do Notion** (respostas, Plano de Ação, reuniões e PLANEJE AQUI de cada mentorada).
2. **Gestão de clientes**: base com aniversário, última compra, curva A/B/C e lista de inativas.
3. **Giro de estoque**: subir a planilha do sistema e gerar a Curva ABC e os blocos de queima.
4. Notificações por e-mail/WhatsApp quando a Camilla responder uma dúvida.
