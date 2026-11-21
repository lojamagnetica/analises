// Calendário do varejo (vale para todas as lojas): as datas que mudam de dia todo ano, as datas mais fortes,
// as de caixa rápido e o que a cliente busca em cada mês, com ideias de campanha para loja de moda.
// Veio do antigo Mapa do Notion, com a linguagem da Loja Magnética. Sem banco aqui (dá para testar).

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d));

/** Domingo de Páscoa (algoritmo de Meeus). */
export function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return utc(ano, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const mais = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
/** O n-ésimo dia da semana do mês (wd: 0 = domingo); n = -1 é o último. */
function enesimo(ano: number, mes: number, wd: number, n: number) {
  if (n > 0) { const p = utc(ano, mes, 1); return mais(p, ((wd - p.getUTCDay() + 7) % 7) + 7 * (n - 1)); }
  const u = utc(ano, mes + 1, 0); return mais(u, -((u.getUTCDay() - wd + 7) % 7));
}

/** As datas que mudam de dia todo ano, já com o dia daquele ano ("AAAA-MM-DD"). */
export function datasMoveis(ano: number): { data: string; titulo: string }[] {
  const p = pascoa(ano);
  return [
    { data: iso(mais(p, -47)), titulo: "Carnaval" },
    { data: iso(p), titulo: "Páscoa" },
    { data: iso(mais(p, 60)), titulo: "Corpus Christi" },
    { data: iso(enesimo(ano, 4, 0, 2)), titulo: "Dia das Mães" },
    { data: iso(enesimo(ano, 7, 0, 2)), titulo: "Dia dos Pais" },
    // Black Friday: a sexta depois da 4ª quinta-feira de novembro.
    { data: iso(mais(enesimo(ano, 10, 4, 4), 1)), titulo: "Black Friday" },
    { data: iso(enesimo(ano, 0, 1, -1)), titulo: "Volta às aulas" },
  ];
}

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** O dia (do mês) de uma data comemorativa sem dia fixo naquele ano, ou null. "Dia das Mães (2º domingo)" → 10 em 2026. */
export function diaDaData(titulo: string, ano: number, mes1a12: number): number | null {
  const t = sem(titulo);
  const m = datasMoveis(ano).find((x) => t.startsWith(sem(x.titulo)) && Number(x.data.slice(5, 7)) === mes1a12);
  return m ? Number(m.data.slice(8)) : null;
}

/** As datas mais fortes do varejo e as que geram caixa rápido. */
const FORTES = ["dia da mulher", "dia das maes", "dia dos namorados", "dia das criancas", "black friday", "natal"];
const RAPIDAS = ["carnaval", "dia do consumidor", "volta as aulas"];
export function seloDaData(titulo: string): "forte" | "rapida" | null {
  const t = sem(titulo);
  if (FORTES.some((x) => t.startsWith(x))) return "forte";
  if (RAPIDAS.some((x) => t.startsWith(x))) return "rapida";
  return null;
}

/** O que a cliente busca em cada mês (0 = janeiro) e ideias de campanha para loja de moda. */
export const MES_CLIENTE: { busca: string; ideias: string[]; rapido?: string }[] = [
  { busca: "Recomeço: organização, rotina, metas e um estilo novo para o ano novo.", ideias: ["\"Seu novo ritmo começa aqui\": look de volta ao trabalho (camisa, calça e acessório).", "Troca de coleção: as novidades primeiro para a carteira.", "Última semana: volta às aulas, com o look da mãe para a rotina."], rapido: "A volta às aulas, na última semana do mês." },
  { busca: "Leveza, alegria e imagem. Depois do Carnaval, volta a rotina e a disciplina.", ideias: ["\"Looks para brilhar\" no Carnaval: conjuntos, brilho e acessórios.", "\"Mala de verão\": saída, biquíni, sandália e bolsa.", "Pós-Carnaval: \"agora começa a sua melhor fase\", com looks para o trabalho."], rapido: "A semana do Carnaval." },
  { busca: "Autoestima, força e identidade. Vontade de renovar o estilo na meia-estação.", ideias: ["Dia da Mulher: vitrine e stories com clientes reais, presente para ela mesma.", "\"Outono essencial\": 5 peças que montam qualquer look.", "Dia do Consumidor sem baixar o preço: uma ação só para o grupo VIP."], rapido: "O Dia do Consumidor (15/03)." },
  { busca: "Momentos em família, conforto e praticidade. Feriados e viagens curtas.", ideias: ["\"Páscoa em família\": looks que combinam para as fotos.", "\"Feriado com estilo\": mala de 3 peças (vestido, sandália e jaqueta leve)."] },
  { busca: "Muita emoção: ela quer um presente que marque.", ideias: ["Dia das Mães com embalagem caprichada e cartão escrito à mão.", "Guia do presente por estilo: clássica, moderna, despojada.", "Stories com as clientes mostrando o presente que levaram."], rapido: "Os 3 últimos dias antes do Dia das Mães." },
  { busca: "Conexão, afeto e aconchego. Chega o frio.", ideias: ["Dia dos Namorados: o look do jantar e o presente pronto.", "Arraiá: vestidos, botas e acessórios.", "\"Inverno que vale\": tricô, bota e casaco."] },
  { busca: "Férias, viagem em família e conforto.", ideias: ["\"Mala de férias\": looks completos para viajar.", "Conforto: peças macias para ficar em casa.", "Liquidação de inverno com as peças paradas, sem queimar a coleção nova."] },
  { busca: "Presente prático e bonito, comprado em cima da hora.", ideias: ["Dia dos Pais: kit pronto para presentear.", "Carrossel com uma opção de presente para cada tipo de pai."] },
  { busca: "Leveza, cores e renovação. Chega a primavera.", ideias: ["Semana da Cliente sem baixar o preço: presente nas compras acima de um valor.", "Coleção primavera: vestidos leves e cores suaves."] },
  { busca: "Família e presentes que surpreendem.", ideias: ["Dia das Crianças: looks mãe e filha.", "Começar a aquecer a carteira para o fim de ano."] },
  { busca: "A vontade de comprar sobe e ela já pensa nos presentes de fim de ano.", ideias: ["Black com exclusividade: acesso antes no grupo VIP e peças de edição limitada.", "Curadoria de presentes de fim de ano, com a história de cada peça."] },
  { busca: "Muita emoção e pressa: ela quer praticidade e uma experiência.", ideias: ["Um destaque por dia: a peça do dia, o look do Natal, a arara do amigo secreto.", "Presentes prontos: embalagem, cartão e vale-presente.", "Looks da virada: branco, dourado e brilho."], rapido: "A primeira semana de dezembro." },
];

/** As datas comemorativas de um mês ("AAAA-MM") com o dia daquele ano: as que mudam de dia ganham o dia certo
 *  (e somem do mês em que não caem naquele ano, como Corpus Christi entre maio e junho); as que faltam no cadastro entram. */
export function datasDoMes<T extends { dia: number | null; titulo: string }>(lista: T[], mes: string): (T | { dia: number; titulo: string })[] {
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7));
  const moveis = datasMoveis(ano);
  const ehMovel = (t: string) => moveis.some((x) => sem(t).startsWith(sem(x.titulo)));
  const out: (T | { dia: number; titulo: string })[] = [];
  for (const x of lista) {
    if (x.dia != null || !ehMovel(x.titulo)) { out.push(x); continue; }
    const d = diaDaData(x.titulo, ano, m);
    if (d) out.push({ ...x, dia: d });
  }
  for (const x of moveis) if (Number(x.data.slice(5, 7)) === m && !out.some((y) => sem(y.titulo).startsWith(sem(x.titulo)))) out.push({ dia: Number(x.data.slice(8)), titulo: x.titulo });
  return out.sort((a, b) => (a.dia ?? 0) - (b.dia ?? 0));
}
