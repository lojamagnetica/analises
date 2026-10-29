"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Carregando, useDados } from "@/lib/hub";
import { moeda } from "@/lib/formato";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  CATEGORIAS, STATUS, TIPOS, TIPOS_MATERIAL, excluirProduto, lerProduto, salvarProduto,
  type Ficha, type Material, type Produto, type Projeto, type Status,
} from "@/lib/produtos";

const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
  { id: "estrutura", rotulo: "Estrutura" },
  { id: "entregaveis", rotulo: "Entregáveis" },
  { id: "valor", rotulo: "Valor" },
  { id: "materiais", rotulo: "Apresentação e venda" },
  { id: "projetos", rotulo: "Projetos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

/** Um campo de texto da ficha do produto. */
function Campo({ rotulo, valor, linhas = 3, dica, muda }: { rotulo: string; valor?: string; linhas?: number; dica?: string; muda: (v: string) => void }) {
  return (
    <label className="ajuda" style={{ display: "block" }}><b style={{ color: "var(--ink)" }}>{rotulo}</b>{dica ? ` · ${dica}` : ""}
      {linhas === 1
        ? <input type="text" value={valor ?? ""} onChange={(e) => muda(e.target.value)} />
        : <textarea rows={linhas} value={valor ?? ""} onChange={(e) => muda(e.target.value)} />}
    </label>
  );
}

function Area() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { dados, recarregar } = useDados(async () => {
    const [p, { data: planos }] = await Promise.all([lerProduto(id), supabaseBrowser().from("planos").select("id, nome").order("ordem")]);
    return { p, planos: (planos ?? []) as { id: string; nome: string }[] };
  }, [id]);
  const [r, setR] = useState<Produto | null>(null);
  const [aba, setAba] = useState<Aba>("visao");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (dados?.p) setR(dados.p); }, [dados]);
  if (!dados) return <Carregando />;
  if (!dados.p || !r) return <p className="mudo">Produto não encontrado. <Link href="/empresa/produtos">Voltar aos produtos</Link></p>;

  const mudou = JSON.stringify(r) !== JSON.stringify(dados.p);
  const f = r.ficha ?? {};
  const ficha = (x: Partial<Ficha>) => setR({ ...r, ficha: { ...f, ...x } });
  const mats = r.materiais ?? [];
  const projs = r.projetos ?? [];
  const mat = (i: number, x: Partial<Material>) => setR({ ...r, materiais: mats.map((m, j) => (j === i ? { ...m, ...x } : m)) });
  const proj = (i: number, x: Partial<Projeto>) => setR({ ...r, projetos: projs.map((m, j) => (j === i ? { ...m, ...x } : m)) });
  const salvar = async () => {
    setMsg("");
    try {
      const { id: _, updated_at: __, ...resto } = r;
      await salvarProduto(r.id, { ...resto, nome: r.nome.trim() || dados.p!.nome });
      setMsg("Salvo ✓"); recarregar();
    } catch (e) { setMsg((e as Error).message); }
  };
  const st = STATUS.find((s) => s.v === r.status) ?? STATUS[0];

  return (
    <>
      <Link className="voltar" href="/empresa/produtos">← Produtos</Link>
      <div className="card mb">
        <div className="linha entre" style={{ gap: 8, flexWrap: "wrap" }}>
          <input type="text" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} style={{ fontSize: 22, fontWeight: 800, flex: 1, minWidth: 200, marginTop: 0 }} />
          <span className={`selo ${st.selo}`}>{st.rotulo}</span>
        </div>
        <div className="grade g4 mt" style={{ gap: "0 10px" }}>
          <label className="ajuda">Como está<select value={r.status} onChange={(e) => setR({ ...r, status: e.target.value as Status })}>{STATUS.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}</select></label>
          <label className="ajuda">Categoria<select value={r.categoria} onChange={(e) => setR({ ...r, categoria: e.target.value })}>{[...new Set([...CATEGORIAS, r.categoria])].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="ajuda">Tipo<select value={r.tipo} onChange={(e) => setR({ ...r, tipo: e.target.value })}>{[...new Set([...TIPOS, r.tipo])].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="ajuda">Preço (R$)<input type="number" min={0} value={r.preco ?? ""} placeholder="Sob consulta" onChange={(e) => setR({ ...r, preco: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        </div>
      </div>

      <div className="chips mb">
        {ABAS.map((a) => <button key={a.id} type="button" className={`chip${aba === a.id ? " escolhido" : ""}`} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
      </div>

      <div className="card mb">
        {aba === "visao" && <>
          <Campo rotulo="Resumo" valor={r.resumo} linhas={2} dica="o produto em uma ou duas frases" muda={(v) => setR({ ...r, resumo: v })} />
          <Campo rotulo="Tema" valor={f.tema} linhas={1} muda={(v) => ficha({ tema: v })} />
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <Campo rotulo="Ponto A" valor={f.ponto_a} dica="onde a cliente está quando chega" muda={(v) => ficha({ ponto_a: v })} />
            <Campo rotulo="Ponto B" valor={f.ponto_b} dica="aonde ela chega com o produto" muda={(v) => ficha({ ponto_b: v })} />
            <Campo rotulo="Para quem é" valor={f.para_quem} muda={(v) => ficha({ para_quem: v })} />
            <Campo rotulo="Para quem não é" valor={f.nao_e_para} muda={(v) => ficha({ nao_e_para: v })} />
          </div>
        </>}
        {aba === "estrutura" && <>
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <Campo rotulo="Formato" valor={f.formato} linhas={1} dica="individual, grupo, turmas, presencial" muda={(v) => ficha({ formato: v })} />
            <Campo rotulo="Duração" valor={f.duracao} linhas={1} dica="ex.: 6 meses, 8 encontros" muda={(v) => ficha({ duracao: v })} />
          </div>
          <Campo rotulo="Pilares (assuntos)" valor={f.pilares} linhas={4} dica="um por linha" muda={(v) => ficha({ pilares: v })} />
          <Campo rotulo="Encontros" valor={f.encontros} linhas={6} dica="um por linha: Encontro 1 · tema" muda={(v) => ficha({ encontros: v })} />
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <Campo rotulo="Hot seat" valor={f.hot_seat} muda={(v) => ficha({ hot_seat: v })} />
            <Campo rotulo="Tutorias" valor={f.tutorias} muda={(v) => ficha({ tutorias: v })} />
            <Campo rotulo="Área de membros" valor={f.area_membros} muda={(v) => ficha({ area_membros: v })} />
            <Campo rotulo="Desafio de implementação" valor={f.desafio} muda={(v) => ficha({ desafio: v })} />
          </div>
          {r.plano_id && <p className="ajuda" style={{ marginBottom: 0 }}>O que o plano inclui no acompanhamento das lojas (reuniões, grupo, leitura) fica em <Link href="/empresa/planos">Planos</Link>.</p>}
        </>}
        {aba === "entregaveis" && <>
          <Campo rotulo="Material de apoio" valor={f.apoio} linhas={5} dica="um por linha" muda={(v) => ficha({ apoio: v })} />
          <Campo rotulo="Bônus" valor={f.bonus} linhas={4} dica="um por linha" muda={(v) => ficha({ bonus: v })} />
        </>}
        {aba === "valor" && <>
          <p style={{ marginTop: 0 }}>À vista: <b>{r.preco ? moeda(r.preco) : "sob consulta"}</b> <small className="mudo">(muda no topo)</small></p>
          <Campo rotulo="Preço parcelado" valor={f.preco_parcelado} linhas={1} dica="ex.: 12x de R$ 1.680" muda={(v) => ficha({ preco_parcelado: v })} />
          <Campo rotulo="Condições" valor={f.condicoes} linhas={3} dica="entrada, desconto à vista, garantia, renovação" muda={(v) => ficha({ condicoes: v })} />
          <div className="grade g2" style={{ gap: "0 10px" }}>
            <label className="ajuda">Plataforma (onde vende ou entrega)<input type="text" value={r.plataforma} placeholder="Ex.: Hubla, Hotmart, contrato" onChange={(e) => setR({ ...r, plataforma: e.target.value })} /></label>
            <label className="ajuda">Plano no Hub (portal da loja)
              <select value={r.plano_id ?? ""} onChange={(e) => setR({ ...r, plano_id: e.target.value || null })}>
                <option value="">Nenhum</option>
                {dados.planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          </div>
        </>}
        {aba === "materiais" && <>
          <p className="ajuda" style={{ marginTop: 0 }}>Links da apresentação, página de venda, roteiro de call, proposta, contrato, materiais de apoio (Canva, Drive, site).</p>
          {mats.map((m, i) => (
            <div key={i} className="linha mb" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="ajuda" style={{ flex: 2, minWidth: 160, margin: 0 }}>Nome<input type="text" value={m.titulo} onChange={(e) => mat(i, { titulo: e.target.value })} /></label>
              <label className="ajuda" style={{ flex: 1, minWidth: 130, margin: 0 }}>Tipo<select value={m.tipo} onChange={(e) => mat(i, { tipo: e.target.value as Material["tipo"] })}>{TIPOS_MATERIAL.map((t) => <option key={t.v} value={t.v}>{t.rotulo}</option>)}</select></label>
              <label className="ajuda" style={{ flex: 3, minWidth: 200, margin: 0 }}>Link<input type="url" value={m.link} placeholder="https://" onChange={(e) => mat(i, { link: e.target.value })} /></label>
              {m.link && <a className="btn s peq" href={m.link} target="_blank" rel="noopener">Abrir</a>}
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar "${m.titulo || "este material"}"?`)) setR({ ...r, materiais: mats.filter((_, j) => j !== i) }); }}>Tirar</button>
            </div>
          ))}
          <button type="button" className="btn s peq" onClick={() => setR({ ...r, materiais: [...mats, { titulo: "", link: "", tipo: "apresentacao" }] })}>+ Material</button>
        </>}
        {aba === "projetos" && <>
          <p className="ajuda" style={{ marginTop: 0 }}>O que falta construir ou melhorar neste produto (gravar aulas, montar a página, criar o bônus…).</p>
          {projs.map((m, i) => (
            <div key={i} className="linha mb" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="ajuda" style={{ flex: 3, minWidth: 200, margin: 0 }}>Projeto<input type="text" value={m.titulo} onChange={(e) => proj(i, { titulo: e.target.value })} /></label>
              <label className="ajuda" style={{ flex: 1, minWidth: 120, margin: 0 }}>Status
                <select value={m.status} onChange={(e) => proj(i, { status: e.target.value as Projeto["status"] })}>
                  <option value="ideia">Ideia</option><option value="fazendo">Fazendo</option><option value="feito">Feito</option>
                </select>
              </label>
              <label className="ajuda" style={{ flex: 1, minWidth: 140, margin: 0 }}>Prazo<input type="date" value={m.prazo} onChange={(e) => proj(i, { prazo: e.target.value })} /></label>
              <label className="ajuda" style={{ flex: 3, minWidth: 200, margin: 0 }}>Observação<input type="text" value={m.obs} onChange={(e) => proj(i, { obs: e.target.value })} /></label>
              <button type="button" className="link-loja" style={{ color: "var(--red)" }} onClick={() => { if (confirm(`Tirar "${m.titulo || "este projeto"}"?`)) setR({ ...r, projetos: projs.filter((_, j) => j !== i) }); }}>Tirar</button>
            </div>
          ))}
          <button type="button" className="btn s peq" onClick={() => setR({ ...r, projetos: [...projs, { titulo: "", status: "ideia", prazo: "", obs: "" }] })}>+ Projeto</button>
        </>}
      </div>

      <div className="linha" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn p" disabled={!mudou} onClick={salvar}>Salvar</button>
        {mudou && <button type="button" className="btn s" onClick={() => setR(dados.p)}>Descartar</button>}
        {msg && <small className="mudo">{msg}</small>}
        <button type="button" className="link-loja" style={{ color: "var(--red)", marginLeft: "auto" }} onClick={async () => {
          if (!confirm(`Excluir o produto "${dados.p!.nome}" com tudo o que tem dentro? Não dá para desfazer.`)) return;
          try { await excluirProduto(r.id); router.replace("/empresa/produtos"); } catch (e) { setMsg((e as Error).message); }
        }}>Excluir produto</button>
      </div>
    </>
  );
}

export default function PaginaProduto() {
  return <Suspense fallback={<Carregando />}><Area /></Suspense>;
}
