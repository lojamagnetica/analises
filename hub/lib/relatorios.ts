// Relatórios do sistema da loja (estoque, vendas, compras): arquivos privados em relatorios/<portal_id>/.
// Só a própria loja e a equipe veem (regras do banco no Storage).
import { supabaseBrowser } from "@/lib/supabase/client";

export type Arquivo = { nome: string; caminho: string; tamanho: number; em: string };

const BALDE = "relatorios";
const LIMITE = 25 * 1024 * 1024;

export async function listarRelatorios(portalId: string): Promise<Arquivo[]> {
  const { data } = await supabaseBrowser().storage.from(BALDE).list(portalId, { sortBy: { column: "created_at", order: "desc" } });
  return (data ?? []).filter((f) => f.name && f.id).map((f) => ({
    nome: f.name.replace(/^\d{13}-/, ""),
    caminho: `${portalId}/${f.name}`,
    tamanho: Number(f.metadata?.size ?? 0),
    em: f.created_at ?? "",
  }));
}

export async function subirRelatorio(portalId: string, arquivo: File) {
  if (arquivo.size > LIMITE) throw new Error("O arquivo passa de 25 MB. Exporte só o período pedido ou mande em partes.");
  const limpo = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
  const { error } = await supabaseBrowser().storage.from(BALDE).upload(`${portalId}/${Date.now()}-${limpo}`, arquivo, { upsert: false });
  if (error) throw new Error("Não deu para subir o arquivo. Confira a internet e tente de novo.");
}

export async function abrirRelatorio(caminho: string) {
  const { data } = await supabaseBrowser().storage.from(BALDE).createSignedUrl(caminho, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}

/** A mensagem que a loja manda para o suporte do sistema dela pedindo os relatórios. */
export function mensagemSuporte(nome: string, loja: string) {
  return `Olá, tudo bem? Sou ${nome || "[seu nome]"}, da loja ${loja || "[nome da loja]"}, cliente de vocês.

Preciso tirar alguns relatórios do sistema em Excel. Vocês podem gerar para mim ou me ensinar o caminho?

1. Estoque atual por produto, com: código, nome do produto, categoria, marca ou fornecedor, tamanho e cor, quantidade em estoque, preço de custo, preço de venda e data da última entrada.

2. Vendas por produto dos últimos 6 meses, com: código, nome do produto, quantidade vendida e valor vendido.

3. Compras por fornecedor dos últimos 12 meses (as notas de entrada), com: fornecedor, data, quantidade de peças e valor.

4. Vendas por vendedora dos últimos 3 meses, com: nome da vendedora, número de vendas, quantidade de peças e valor vendido.

Se algum deles não existir pronto, pode me mandar o mais parecido que tiverem.

Agradeço!`;
}

export const tamanhoLegivel = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
