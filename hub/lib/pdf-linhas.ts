// Lê um PDF no navegador e devolve o texto em linhas, com 2+ espaços entre as colunas (como uma tabela impressa).
// Só roda no navegador do usuário: o arquivo não sai do aparelho para ser lido.

type Item = { str: string; transform: number[]; width: number };

/** Junta os pedaços de texto da página em linhas: mesma altura = mesma linha; vão grande entre pedaços = nova coluna. */
export function linhasDaPagina(itens: Item[]): string[] {
  const pedacos = itens.filter((i) => i.str.trim() !== "").map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width }));
  pedacos.sort((a, b) => (Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x));
  const linhas: { y: number; p: typeof pedacos }[] = [];
  for (const p of pedacos) {
    const l = linhas.find((x) => Math.abs(x.y - p.y) <= 2);
    if (l) l.p.push(p); else linhas.push({ y: p.y, p: [p] });
  }
  linhas.sort((a, b) => b.y - a.y);
  return linhas.map((l) => {
    l.p.sort((a, b) => a.x - b.x);
    let t = "";
    let fim = 0;
    for (const p of l.p) {
      if (t) t += p.x - fim > 6 ? "   " : p.x - fim > 0.5 ? " " : "";
      t += p.s;
      fim = p.x + p.w;
    }
    return t;
  });
}

export async function textoDoPdf(arquivo: File | ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const dados = arquivo instanceof ArrayBuffer ? arquivo : await arquivo.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(dados) }).promise;
  const linhas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const conteudo = await pagina.getTextContent();
    linhas.push(...linhasDaPagina(conteudo.items as unknown as Item[]));
  }
  return linhas.join("\n");
}
