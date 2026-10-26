// Relatórios do sistema da loja (estoque, vendas, compras): arquivos privados em relatorios/<portal_id>/.
// Só a própria loja e a equipe veem (regras do banco no Storage).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Arquivo = { nome: string; caminho: string; tamanho: number; em: string; tipo: string };

/** Os relatórios que a loja com sistema manda para o Diagnóstico. Cada um tem o seu lugar para subir. */
export const RELATORIOS = [
  { chave: "clientes", titulo: "Cadastro de clientes atualizado", oque: "Nome, WhatsApp, data de aniversário, data da última compra e, se o sistema tiver, quantas compras e quanto cada cliente já comprou." },
  { chave: "vendas_12m", titulo: "Vendas por produto · últimos 12 meses", oque: "Data, código, produto, categoria, marca ou fornecedor, quantidade, valor vendido e, se tiver, a vendedora." },
  { chave: "vendas_24m", titulo: "Vendas por produto · os 12 meses anteriores", oque: "O mesmo relatório do ano anterior, para comparar ano com ano." },
  { chave: "estoque", titulo: "Estoque atual por produto ou por fornecedor", oque: "Código, produto, categoria, marca ou fornecedor, tamanho e cor, quantidade, preço de custo, preço de venda e data da última entrada." },
] as const;
export type TipoRelatorio = (typeof RELATORIOS)[number]["chave"] | "outros";
const TIPOS = RELATORIOS.map((r) => r.chave as string);

const BALDE = "relatorios";
const LIMITE = 25 * 1024 * 1024;

export async function listarRelatorios(portalId: string): Promise<Arquivo[]> {
  const { data } = await supabaseBrowser().storage.from(BALDE).list(portalId, { sortBy: { column: "created_at", order: "desc" } });
  return (data ?? []).filter((f) => f.name && f.id).map((f) => {
    // Nome no Storage: <data>-<tipo>__<arquivo>. Arquivos antigos não têm o tipo.
    const resto = f.name.replace(/^\d{13}-/, "");
    const [prefixo, ...nome] = resto.split("__");
    const tipo = nome.length && (TIPOS.includes(prefixo) || prefixo === "outros") ? prefixo : "outros";
    return {
      nome: nome.length && tipo === prefixo ? nome.join("__") : resto,
      tipo,
      caminho: `${portalId}/${f.name}`,
      tamanho: Number(f.metadata?.size ?? 0),
      em: f.created_at ?? "",
    };
  });
}

export async function subirRelatorio(portalId: string, arquivo: File, tipo: TipoRelatorio = "outros") {
  if (arquivo.size > LIMITE) throw new Error("O arquivo passa de 25 MB. Exporte só o período pedido ou mande em partes.");
  const limpo = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
  const { error } = await supabaseBrowser().storage.from(BALDE).upload(`${portalId}/${Date.now()}-${tipo}__${limpo}`, arquivo, { upsert: false });
  if (error) throw new Error("Não deu para subir o arquivo. Confira a internet e tente de novo.");
}

/** A loja apaga um arquivo que subiu por engano. */
export async function excluirRelatorio(caminho: string) {
  const { error } = await supabaseBrowser().storage.from(BALDE).remove([caminho]);
  if (error) throw new Error("Não deu para excluir o arquivo. Tente de novo.");
}

export async function abrirRelatorio(caminho: string) {
  const { data } = await supabaseBrowser().storage.from(BALDE).createSignedUrl(caminho, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}

/** A mensagem que a loja manda para o suporte do sistema dela pedindo os relatórios. */
export function mensagemSuporte(nome: string, loja: string) {
  return `Olá, tudo bem? Sou ${nome || "[seu nome]"}, da loja ${loja || "[nome da loja]"}, cliente de vocês.

Preciso tirar alguns relatórios do sistema em Excel. Vocês podem gerar para mim ou me ensinar o caminho?

1. Cadastro de clientes atualizado, com: nome, WhatsApp, data de aniversário, data da última compra e, se tiver, quantidade de compras e total comprado.

2. Vendas por produto dos últimos 12 meses, com: data, código, nome do produto, categoria, marca ou fornecedor, quantidade, valor vendido e vendedora.

3. O mesmo relatório de vendas por produto dos 12 meses anteriores (para comparar com o ano passado).

4. Estoque atual por produto (ou por fornecedor), com: código, nome do produto, categoria, marca ou fornecedor, tamanho e cor, quantidade, preço de custo, preço de venda e data da última entrada.

Se algum deles não existir pronto, pode me mandar o mais parecido que tiverem.

Agradeço!`;
}

export const tamanhoLegivel = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
