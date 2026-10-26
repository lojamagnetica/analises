// Textos do "Como usar o Hub", chaveados pelo href do menu. Página sem texto aparece no guia mesmo assim.
export type TextoGuia = { oque: string; passos: string[] };

export const GUIA: Record<string, TextoGuia> = {
  // Minha mentoria / Minha consultoria
  "/jornada": { oque: "Os 7 passos da mentoria e em qual deles você está agora.", passos: ["Veja o passo destacado: é o foco do momento.", "Abra o passo para ler o que fazer nele."] },
  "/plano": { oque: "O seu Plano de Ação de 90 dias, montado para a sua loja a partir do Diagnóstico.", passos: ["Leia as tarefas do mês.", "Marque cada uma quando terminar: a Camilla acompanha daqui."] },
  "/reunioes": { oque: "Os seus encontros com a Camilla: data, link da sala e a gravação depois.", passos: ["Veja a próxima reunião e entre pelo link na hora.", "Depois do encontro, assista à gravação quando quiser."] },
  "/notas": { oque: "O seu caderno dentro do Hub, para anotar o que quiser.", passos: ["Crie uma nota nova.", "Edite ou exclua quando precisar."] },
  "/consultoria": { oque: "O painel da consultoria: o mês em que você está, as ações combinadas e o que falta.", passos: ["Veja as ações da loja do mês.", "Marque o que já foi feito."] },
  "/contrato": { oque: "O seu plano, quando começou, quando termina e quanto falta.", passos: ["Veja a barra do tempo da mentoria.", "Perto do fim, peça para conversar sobre a renovação."] },
  // Minha loja
  "/personalizacao": { oque: "As etapas em que você conta como a loja funciona hoje. É daqui que sai o seu Diagnóstico.", passos: ["Responda uma etapa de cada vez (dá para parar e voltar depois).", "Quando não souber um número, marque \"é uma estimativa\" ou \"ainda não tenho\".", "Cadastre a sua equipe na etapa Time de vendas."] },
  "/personalizacao/etapa?n=8": { oque: "O estoque da loja e os relatórios do seu sistema.", passos: ["Suba o relatório do sistema ou responda estimando.", "Atualize sempre que tiver um relatório novo."] },
  // Diagnóstico
  "/painel": { oque: "O retrato da loja hoje: números, estoque, marcas, linhas e equipe, cada alerta com a ação.", passos: ["Leia os alertas de cima para baixo.", "Veja a ação sugerida em cada um.", "As tarefas vão para o seu Plano de Ação."] },
  "/estoque": { oque: "O que fazer com cada parte do estoque: o que gira, o que está parado e o que repor.", passos: ["Comece pelas peças paradas.", "Siga a ação indicada para cada grupo."] },
  "/gestao/compras": { oque: "Quanto comprar e quando, a partir do que a loja vende.", passos: ["Confira o limite de compra do mês.", "Use antes de ir ao fornecedor."] },
  "/gestao/linhas": { oque: "Quanto cada linha de produto pesa no estoque e nas vendas.", passos: ["Veja as linhas que vendem mais do que ocupam.", "Ajuste a compra das que sobram."] },
  "/gestao/fornecedores": { oque: "Quais fornecedores trazem resultado para a loja.", passos: ["Compare o que cada um vende e o que fica parado.", "Use na hora de negociar."] },
  "/conteudo": { oque: "A análise do seu Instagram feita pela equipe: correções do perfil, o que parar e o que começar.", passos: ["Faça as correções do perfil.", "Marque cada uma quando terminar.", "Depois vá para a Programação da semana."] },
  // Gestão estratégica
  "/gestao/caixa": { oque: "O fechamento do dia: faturamento, vendas e peças.", passos: ["Todo dia, ao fechar a loja, lance os números.", "Edite ou exclua um lançamento se errar."] },
  "/gestao/resultado": { oque: "PA, ticket médio e preço médio do mês, calculados do fechamento de caixa.", passos: ["Veja como o mês está indo.", "Compare com o mês anterior."] },
  "/metas": { oque: "Da meta do mês para o que precisa acontecer todo dia.", passos: ["Coloque a meta do mês.", "Veja quantas vendas e peças por dia ela pede."] },
  // Gestão de pessoas
  "/pessoas": { oque: "Quem trabalha na loja, o perfil de cada pessoa e como lidar com ela.", passos: ["Cadastre cada pessoa do time.", "Peça para cada uma fazer o teste de perfil.", "Edite ou tire alguém quando mudar o time."] },
  "/pessoas/retorno": { oque: "Um roteiro para dar retorno a alguém do time, do jeito certo para o perfil dela.", passos: ["Escolha a pessoa.", "Siga o roteiro na conversa."] },
  "/pessoas/reuniao-semanal": { oque: "A pauta pronta da reunião rápida da semana.", passos: ["Abra no dia da reunião.", "Siga os pontos e anote o combinado."] },
  "/pessoas/reuniao-mensal": { oque: "A reunião do mês com os números do time.", passos: ["Mostre o resultado de cada pessoa.", "Reconheça quem se destacou."] },
  "/pessoas/desenvolvimento": { oque: "O que cada pessoa do time precisa desenvolver.", passos: ["Escolha um ponto por pessoa.", "Acompanhe a evolução."] },
  "/pessoas/gincanas": { oque: "Gincanas prontas para animar o time e vender mais.", passos: ["Escolha uma gincana.", "Combine as regras com o time e acompanhe o placar."] },
  // Vendas
  "/acoes": { oque: "Ações de venda prontas para a sua loja, com cronograma, mensagens, conteúdo e placar.", passos: ["Escolha a ação do mês.", "Siga o cronograma dia a dia.", "Lance os resultados no placar."] },
  "/scripts": { oque: "Scripts de venda para o time usar no atendimento e no WhatsApp.", passos: ["Escolha a situação.", "Copie e adapte com o jeito da loja."] },
  "/planeje": { oque: "Um card por mês: datas comerciais, produtos em destaque, ações, meta e as 4 semanas.", passos: ["Abra o mês.", "Preencha o que vai acontecer em cada semana."] },
  // De cliente a fã
  "/clientes": { oque: "As suas clientes: quando compraram e quanto gastaram, separadas por tipo.", passos: ["Cadastre ou importe as clientes.", "Edite ou exclua quando precisar.", "Veja com quem falar hoje."] },
  "/clientes/tipos": { oque: "O que fazer com cada tipo de cliente (nova, fiel, sumida…).", passos: ["Escolha o tipo.", "Siga a ação indicada."] },
  "/clientes/resgate": { oque: "Mensagens para trazer de volta quem sumiu.", passos: ["Veja quem está sem comprar.", "Mande a mensagem pronta pelo WhatsApp."] },
  "/clientes/campanhas": { oque: "As 10 campanhas que mais funcionam com a carteira de clientes.", passos: ["Escolha uma campanha.", "Adapte e dispare."] },
  "/clientes/experiencia": { oque: "Ideias para a cliente sair encantada da loja.", passos: ["Escolha uma ideia.", "Combine com o time."] },
  // Conteúdo
  "/conteudo/semana": { oque: "Os posts da semana (ou do mês) montados para a sua loja, do roteiro ao publicado.", passos: ["Clique em \"Montar a minha semana\".", "Abra cada post, ajuste com as suas peças e avance a etapa.", "Use a visão Mês para ver tudo de uma vez."] },
  "/conteudo/pautas": { oque: "Assuntos do momento escolhidos pela equipe, com o ângulo certo para a sua loja.", passos: ["Leia a pauta e o porquê.", "Coloque na sua semana ou crie o roteiro direto."] },
  "/conteudo/roteiro": { oque: "O gerador de roteiro e legenda a partir dos modelos do método.", passos: ["Escolha o modelo.", "Preencha com a sua peça.", "Salve na programação."] },
  "/conteudo/bio": { oque: "A página do link da sua bio: WhatsApp, ação do mês, como chegar e mais.", passos: ["Monte os blocos e escolha a aparência.", "Publique e copie o link.", "Cole o link na bio do Instagram."] },
  "/conteudo/resultados": { oque: "Os números dos seus posts: visualizações, mensagens e vendas.", passos: ["Lance os números de cada post publicado.", "Veja o que mais deu resultado."] },
  "/conteudo/desafio": { oque: "Um desafio de conteúdo com missões diárias.", passos: ["Comece o desafio.", "Faça a missão do dia e marque como feita."] },
  // Fim do menu
  "/indique": { oque: "Indique uma loja amiga para a mentoria e acompanhe a indicação.", passos: ["Avise a pessoa antes.", "Preencha os dados dela.", "Acompanhe a situação aqui."] },
  "/cursos": { oque: "As aulas do Método Loja Magnética, no seu ritmo.", passos: ["Comece pelo primeiro módulo.", "Marque cada aula quando assistir."] },
};
