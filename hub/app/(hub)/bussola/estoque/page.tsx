"use client";

import { useState } from "react";
import { AbasBussola } from "@/components/AbasBussola";
import { Excluir } from "@/components/Excluir";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dataCurta } from "@/lib/formato";
import { DIAS_PARADO, buscarItens, removerItem, salvarItem, type ItemEstoque } from "@/lib/bussola";

type Form = { id?: string; produto: string; qtd: string; dias: string; giro: string; postado: string; objetivo: boolean; obs: string };
const vazio: Form = { produto: "", qtd: "1", dias: "", giro: "", postado: "", objetivo: false, obs: "" };

export default function EstoqueParado() {
  const { portal } = usePortal();
  const { dados, recarregar } = useDados(() => buscarItens(portal.id), [portal.id]);
  const [f, setF] = useState<Form>(vazio);
  const [erro, setErro] = useState("");
  if (!dados) return <Carregando />;

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro("");
    if (!f.produto.trim()) return setErro("Escreva o nome do produto ou da linha.");
    try {
      await salvarItem(portal.id, { id: f.id, produto: f.produto, qtd: Number(f.qtd) || 1, dias_parado: Number(f.dias) || 0, giro: f.giro, postado_em: f.postado, objetivo: f.objetivo, obs: f.obs });
      setF(vazio); recarregar();
    } catch (x) { setErro((x as Error).message); }
  }
  const editar = (i: ItemEstoque) => { setF({ id: i.id, produto: i.produto, qtd: String(i.qtd), dias: String(i.dias_parado), giro: i.giro ?? "", postado: i.postado_em ?? "", objetivo: i.objetivo, obs: i.obs ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const marcar = (i: ItemEstoque, x: Partial<ItemEstoque>) => salvarItem(portal.id, { ...i, ...x }).then(recarregar).catch((e) => setErro(e.message));

  return (
    <>
      <Titulo titulo="Estoque parado" sub={`Peças que precisam de atenção e estratégia. A partir de ${DIAS_PARADO} dias paradas, a Bússola avisa se ainda não foram para o conteúdo.`} aba="Estoque parado" />
      <AbasBussola />
      {erro && <div className="aviso erro mb">{erro}</div>}

      <form className="card mb" onSubmit={salvar}>
        <h2 style={{ marginTop: 0 }}>{f.id ? "Editar item" : "Adicionar item parado"}</h2>
        <div className="grade g3">
          <label>Produto ou linha<input type="text" value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })} placeholder="Ex.: Vestido midi estampado" /></label>
          <label>Peças<input type="number" min={1} value={f.qtd} onChange={(e) => setF({ ...f, qtd: e.target.value })} /></label>
          <label>Dias parado<input type="number" min={0} value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} /></label>
          <label>Giro<select value={f.giro} onChange={(e) => setF({ ...f, giro: e.target.value })}><option value="">Não sei</option><option>Lento</option><option>Médio</option><option>Rápido</option></select></label>
          <label>Já postado em<input type="date" value={f.postado} onChange={(e) => setF({ ...f, postado: e.target.value })} /></label>
          <label>Observação<input type="text" value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></label>
        </div>
        <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" checked={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.checked })} /> É objetivo da semana do time</label>
        <button className="btn p" type="submit">{f.id ? "Salvar" : "Adicionar"}</button>
        {f.id && <button className="btn s" type="button" style={{ marginLeft: 8 }} onClick={() => setF(vazio)}>Cancelar</button>}
      </form>

      {dados.length === 0 ? <div className="card"><p style={{ margin: 0 }}>Nada cadastrado ainda.</p></div> : dados.map((i) => (
        <div key={i.id} className="card card-borda mb" style={{ ["--c" as string]: i.dias_parado >= DIAS_PARADO && !i.postado_em ? "var(--red)" : "var(--orange)" }}>
          <div className="linha entre">
            <b>{i.produto}</b>
            <span>
              {i.objetivo && <span className="selo andamento">Objetivo da semana</span>} <span className={`selo ${i.postado_em ? "feito" : "alerta"}`}>{i.postado_em ? `Postado ${dataCurta(i.postado_em)}` : "Não postado"}</span>
            </span>
          </div>
          <p className="mudo" style={{ margin: "4px 0" }}>{i.qtd} peça(s) · parado há {i.dias_parado} dias{i.giro ? ` · giro ${i.giro.toLowerCase()}` : ""}{i.obs ? ` · ${i.obs}` : ""}</p>
          <div className="linha" style={{ gap: 12 }}>
            <button type="button" className="link-loja" onClick={() => marcar(i, { objetivo: !i.objetivo })}>{i.objetivo ? "Tirar do objetivo" : "Virar objetivo da semana"}</button>
            <button type="button" className="link-loja" onClick={() => editar(i)}>Editar</button>
            <Excluir pergunta={`Excluir “${i.produto}” da lista?`} fazer={() => removerItem(i.id)} aoFim={recarregar} />
          </div>
        </div>
      ))}
    </>
  );
}
