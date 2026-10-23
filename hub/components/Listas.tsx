"use client";

// Editores de lista usados na Análise do Perfil: uma linha por item, ou um cartão por item com os seus campos.

export function ListaTexto({ rotulo, valor, aoMudar, linhas = 5, ajuda }: { rotulo: string; valor: string[]; aoMudar: (v: string[]) => void; linhas?: number; ajuda?: string }) {
  return (
    <>
      <label className="rotulo">{rotulo} <small className="mudo">(um por linha)</small></label>
      <textarea rows={linhas} value={valor.join("\n")} onChange={(e) => aoMudar(e.target.value.split("\n"))} onBlur={() => aoMudar(valor.map((x) => x.trim()).filter(Boolean))} />
      {ajuda && <p className="ajuda">{ajuda}</p>}
    </>
  );
}

export type Campo<T> = { k: keyof T & string; rotulo: string; tipo?: "texto" | "area" | "numero" | "marcar" | "opcoes"; opcoes?: string[]; largo?: boolean };

export function ListaObjetos<T extends object>({ itens, campos, novo, aoMudar, nomeItem, extra }: {
  itens: T[]; campos: Campo<T>[]; novo: () => T; aoMudar: (v: T[]) => void; nomeItem: string; extra?: (item: T, i: number) => React.ReactNode;
}) {
  const muda = (i: number, k: keyof T, v: unknown) => aoMudar(itens.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i: number, d: number) => {
    const n = [...itens]; const [x] = n.splice(i, 1); n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x); aoMudar(n);
  };
  return (
    <div>
      {itens.map((item, i) => (
        <div key={i} className="card mb" style={{ padding: 14, background: "var(--soft)" }}>
          <div className="linha entre">
            <b>{nomeItem} {i + 1}</b>
            <div className="linha" style={{ gap: 4 }}>
              <button type="button" className="btn s peq" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
              <button type="button" className="btn s peq" aria-label="Descer" disabled={i === itens.length - 1} onClick={() => mover(i, 1)}>↓</button>
              <button type="button" className="btn s peq" onClick={() => aoMudar(itens.filter((_, j) => j !== i))}>Tirar</button>
            </div>
          </div>
          <div className="grade g2" style={{ gap: "0 12px" }}>
            {campos.map((c) => {
              const v = item[c.k] as unknown;
              const id = `${nomeItem}-${i}-${c.k}`;
              if (c.tipo === "marcar") return (
                <label key={c.k} className="marcar" style={{ alignSelf: "end" }}><input type="checkbox" checked={!!v} onChange={(e) => muda(i, c.k, e.target.checked)} /><span>{c.rotulo}</span></label>
              );
              return (
                <div key={c.k} style={c.largo || c.tipo === "area" ? { gridColumn: "1 / -1" } : undefined}>
                  <label className="rotulo" htmlFor={id}>{c.rotulo}</label>
                  {c.tipo === "area" ? <textarea id={id} rows={2} value={String(v ?? "")} onChange={(e) => muda(i, c.k, e.target.value)} />
                    : c.tipo === "opcoes" ? <select id={id} value={String(v ?? "")} onChange={(e) => muda(i, c.k, e.target.value)}>{c.opcoes!.map((o) => <option key={o}>{o}</option>)}</select>
                    : c.tipo === "numero" ? <input id={id} type="number" value={v == null ? "" : String(v)} onChange={(e) => muda(i, c.k, e.target.value === "" ? 0 : Number(e.target.value))} />
                    : <input id={id} type="text" value={String(v ?? "")} onChange={(e) => muda(i, c.k, e.target.value)} />}
                </div>
              );
            })}
          </div>
          {extra?.(item, i)}
        </div>
      ))}
      <button type="button" className="btn s peq" onClick={() => aoMudar([...itens, novo()])}>+ {nomeItem}</button>
    </div>
  );
}
