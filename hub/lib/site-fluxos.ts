"use client";

// Fluxos do site em etapas: prospecção de clientes, pedidos (separação e status), carrinhos abandonados e trocas.
// Cada fluxo diz as etapas, os campos, a mensagem pronta de cada etapa e o checklist (quando tem).
import { hoje } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ItemFluxo = {
  id: string; portal_id: string; tipo: string; nome: string; telefone: string; numero: string; valor: number; etapa: string;
  responsavel: string; prazo: string | null; info: Record<string, string | number[]>; avisado: string; dia: string; updated_at: string;
};
export type Campo = { k: string; rotulo: string; tipo?: "texto" | "valor" | "data" | "longo" | "opcoes"; opcoes?: string[] };
export type Fluxo = {
  tipo: string; item: string; etapas: string[]; finais: string[]; campos: Campo[];
  msgs: Record<string, string>; checklist?: Record<string, string[]>; prazoDias?: number;
};
/** Colunas da tabela; o resto dos campos vai em info. */
export const COLUNAS = ["nome", "telefone", "numero", "valor", "responsavel", "prazo"];

export const FLUXOS: Record<string, Fluxo> = {
  lead: {
    tipo: "lead", item: "cliente", prazoDias: 1,
    etapas: ["Novo contato", "Em conversa", "Mandou fotos ou link", "Comprou", "Sem resposta"], finais: ["Comprou", "Sem resposta"],
    campos: [
      { k: "nome", rotulo: "Nome" }, { k: "telefone", rotulo: "WhatsApp" },
      { k: "origem", rotulo: "De onde veio", tipo: "opcoes", opcoes: ["Instagram", "Anúncio", "Indicação", "Loja física", "Live", "Site", "Outro"] },
      { k: "interesse", rotulo: "O que procura" }, { k: "responsavel", rotulo: "Quem atende" }, { k: "prazo", rotulo: "Próximo contato", tipo: "data" },
      { k: "valor", rotulo: "Valor da compra", tipo: "valor" },
    ],
    msgs: {
      "Novo contato": "Oi, {nome}! Aqui é {consultora}, da {loja}. Vi que você se interessou por {interesse}. Posso te mandar as opções que temos agora?",
      "Em conversa": "{nome}, separei umas opções de {interesse} pensando em você. Quer ver?",
      "Mandou fotos ou link": "{nome}, conseguiu ver as fotos? Se quiser, te ajudo com o tamanho e já deixo reservado.",
      "Sem resposta": "Oi, {nome}! Passando para lembrar que as peças que te mostrei ainda estão disponíveis. Qualquer coisa, estou aqui.",
    },
  },
  pedido: {
    tipo: "pedido", item: "pedido", prazoDias: 1,
    etapas: ["Pago", "Em separação", "Separado", "Enviado", "Entregue", "Cancelado"], finais: ["Entregue", "Cancelado"],
    campos: [
      { k: "numero", rotulo: "Nº do pedido" }, { k: "nome", rotulo: "Cliente" }, { k: "telefone", rotulo: "WhatsApp" },
      { k: "valor", rotulo: "Valor", tipo: "valor" }, { k: "envio", rotulo: "Envio", tipo: "opcoes", opcoes: ["Correios", "Transportadora", "Motoboy", "Retirada na loja"] },
      { k: "rastreio", rotulo: "Código de rastreio" }, { k: "responsavel", rotulo: "Quem separa" }, { k: "prazo", rotulo: "Despachar até", tipo: "data" },
      { k: "itens", rotulo: "Itens (peça, cor, tamanho)", tipo: "longo" },
    ],
    checklist: {
      "Em separação": [
        "Conferir cada peça, cor e tamanho com o pedido",
        "Olhar se a peça não tem defeito ou mancha",
        "Embalar no padrão da marca (papel, tag, cartão)",
        "Colocar a nota ou declaração",
        "Colar a etiqueta de envio",
        "Tirar foto do pacote fechado",
      ],
    },
    msgs: {
      Pago: "Oi, {nome}! Recebemos o seu pedido {numero} e o pagamento foi aprovado. Já vamos separar com todo o cuidado.",
      Separado: "{nome}, o seu pedido {numero} está separado e embalado. Em breve sai para entrega!",
      Enviado: "{nome}, o seu pedido {numero} saiu para entrega! Código de rastreio: {rastreio}",
      Entregue: "{nome}, o seu pedido {numero} chegou? Conta pra gente o que achou das peças!",
      Cancelado: "{nome}, o seu pedido {numero} foi cancelado. Qualquer dúvida, estou aqui para ajudar.",
    },
  },
  carrinho: {
    tipo: "carrinho", item: "carrinho",
    etapas: ["Abandonado", "1ª mensagem (até 1h)", "2ª mensagem (24h)", "3ª mensagem (72h)", "Recuperado", "Perdido"], finais: ["Recuperado", "Perdido"],
    campos: [
      { k: "nome", rotulo: "Cliente" }, { k: "telefone", rotulo: "WhatsApp" }, { k: "valor", rotulo: "Valor do carrinho", tipo: "valor" },
      { k: "itens", rotulo: "O que deixou no carrinho", tipo: "longo" }, { k: "link", rotulo: "Link do carrinho" }, { k: "responsavel", rotulo: "Quem cuida" },
    ],
    msgs: {
      "1ª mensagem (até 1h)": "Oi, {nome}! Vi que você deixou {itens} no carrinho. Ficou alguma dúvida de tamanho ou de entrega? {link}",
      "2ª mensagem (24h)": "{nome}, as peças que você escolheu ainda estão separadas para você, mas o estoque é pequeno. Quer que eu te ajude a finalizar? {link}",
      "3ª mensagem (72h)": "{nome}, liberei uma condição especial para você finalizar hoje o seu carrinho: {link}",
      Recuperado: "Obrigada, {nome}! Pedido confirmado. Já vamos separar tudo com carinho.",
    },
  },
  troca: {
    tipo: "troca", item: "troca", prazoDias: 3,
    etapas: ["Solicitada", "Aguardando o produto", "Produto recebido", "Resolvida"], finais: ["Resolvida"],
    campos: [
      { k: "numero", rotulo: "Nº do pedido" }, { k: "nome", rotulo: "Cliente" }, { k: "telefone", rotulo: "WhatsApp" },
      { k: "tipo_troca", rotulo: "Tipo", tipo: "opcoes", opcoes: ["Troca de tamanho", "Troca de modelo", "Devolução", "Defeito"] },
      { k: "motivo", rotulo: "Motivo", tipo: "opcoes", opcoes: ["Tamanho não serviu", "Não gostou do modelo", "Cor diferente da foto", "Defeito", "Atraso na entrega", "Outro"] },
      { k: "solucao", rotulo: "Como resolver", tipo: "opcoes", opcoes: ["Outra peça", "Vale-troca", "Estorno", "Conserto"] },
      { k: "valor", rotulo: "Valor envolvido", tipo: "valor" }, { k: "responsavel", rotulo: "Quem cuida" }, { k: "prazo", rotulo: "Resolver até", tipo: "data" },
    ],
    msgs: {
      Solicitada: "Oi, {nome}! Recebemos o seu pedido de troca do pedido {numero}. Vou te explicar como enviar a peça.",
      "Aguardando o produto": "{nome}, já estamos aguardando a peça do pedido {numero}. Assim que chegar, te aviso.",
      "Produto recebido": "{nome}, a peça chegou aqui! Já estamos resolvendo a sua troca.",
      Resolvida: "{nome}, a sua troca do pedido {numero} está resolvida. Obrigada pela paciência!",
    },
  },
};

const sb = () => supabaseBrowser();
async function ok<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r;
}
export async function buscarFluxo(portalId: string, tipo: string) {
  const desde = new Date(Date.parse(hoje()) - 90 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb().from("site_fluxos").select("*").eq("portal_id", portalId).eq("tipo", tipo).gte("dia", desde).order("created_at", { ascending: false }).limit(2000);
  return (data ?? []) as ItemFluxo[];
}
export const salvarItemFluxo = (portalId: string, id: string | null, d: Partial<ItemFluxo>) => {
  const dados = { ...d, updated_at: new Date().toISOString() };
  return ok(id ? sb().from("site_fluxos").update(dados).eq("id", id) : sb().from("site_fluxos").insert({ ...dados, portal_id: portalId }));
};
export const excluirItemFluxo = (id: string) => ok(sb().from("site_fluxos").delete().eq("id", id));
export const atrasadoFluxo = (f: Fluxo, i: ItemFluxo) => !f.finais.includes(i.etapa) && !!i.prazo && i.prazo < hoje();

/** A mensagem da etapa com os dados do item. */
export function mensagem(f: Fluxo, i: ItemFluxo, loja: string) {
  const t = f.msgs[i.etapa];
  if (!t) return "";
  const v: Record<string, string> = { nome: i.nome.trim().split(/\s+/)[0] || "", numero: i.numero ? `nº ${i.numero}` : "", loja, consultora: i.responsavel.trim().split(/\s+/)[0] || "[seu nome]" };
  for (const [k, x] of Object.entries(i.info ?? {})) if (typeof x === "string") v[k] = x;
  return t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "").replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

// ───── POP de atendimento ─────
export type SecaoPop = { titulo: string; texto: string };
export const POP_PADRAO: SecaoPop[] = [
  { titulo: "Tempo de resposta", texto: "Responder toda mensagem em até 15 minutos no horário da loja.\nFora do horário: mensagem automática dizendo quando vamos responder.\nNinguém fica sem resposta no fim do dia." },
  { titulo: "Como atender (o passo a passo)", texto: "1. Cumprimentar pelo nome e se apresentar.\n2. Perguntar o que a cliente procura e para qual ocasião.\n3. Mandar no máximo 3 opções, com foto e preço.\n4. Ajudar com o tamanho (tabela de medidas).\n5. Mandar o link ou fechar o pedido pelo WhatsApp.\n6. Confirmar pagamento, prazo e forma de entrega.\n7. Registrar a cliente para a régua de recompra." },
  { titulo: "Frases prontas", texto: "Abertura: \nDúvida de tamanho: \nPrazo de entrega: \nFrete: \nForma de pagamento: " },
  { titulo: "Trocas e devoluções (a regra)", texto: "Prazo para pedir: \nComo enviar a peça: \nQuem paga o frete: \nComo devolvemos o valor: " },
  { titulo: "Quando passar para a gerente", texto: "Reclamação, atraso maior que o prazo, defeito ou cliente pedindo desconto fora da política." },
];
export async function buscarPop(portalId: string) {
  const { data } = await sb().from("site_config").select("pop").eq("portal_id", portalId).maybeSingle();
  return ((data?.pop ?? []) as SecaoPop[]);
}
export const salvarPop = (portalId: string, pop: SecaoPop[]) =>
  ok(sb().from("site_config").upsert({ portal_id: portalId, pop, updated_at: new Date().toISOString() }, { onConflict: "portal_id" }));
