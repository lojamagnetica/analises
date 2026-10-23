"use client";

import { useState } from "react";
import { useDados } from "@/lib/hub";
import { supabaseBrowser } from "@/lib/supabase/client";
import { contratoApagar, contratoSalvar, fichaSalvar } from "@/lib/acoes";
import {
  ETAPAS_JORNADA, FUNDAMENTOS, SITUACOES, TERMOMETROS, corTermometro,
  type Contrato, type Ficha, type PessoaEquipe, type Plano,
} from "@/lib/carteira";
import { dia, moeda } from "@/lib/formato";

function CamposContrato({ c, planos }: { c?: Contrato; planos: Plano[] }) {
  return (
    <div className="grade g2" style={{ gap: 12 }}>
      <div>
        <label className="rotulo">Plano</label>
        <select name="plano_id" defaultValue={c?.plano_id ?? ""}>
          <option value="">—</option>
          {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.vendendo ? "" : " (antigo)"}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo">Status</label>
        <select name="status" defaultValue={c?.status ?? "Ativo"}><option>Ativo</option><option>Renovado</option><option>Encerrado</option></select>
      </div>
      <div><label className="rotulo">Início</label><input type="date" name="inicio" defaultValue={c?.inicio ?? ""} /></div>
      <div><label className="rotulo">Fim</label><input type="date" name="fim" defaultValue={c?.fim ?? ""} /></div>
      <div><label className="rotulo">Valor (R$)</label><input type="text" inputMode="decimal" name="valor" defaultValue={c?.valor ?? ""} /></div>
      <div><label className="rotulo">Condição</label><input type="text" name="condicao" defaultValue={c?.condicao ?? ""} placeholder="Ex.: modelo híbrido" /></div>
    </div>
  );
}

/** Ficha da loja e contratos. Só a equipe vê (o banco garante). */
export function FichaLoja({ portalId }: { portalId: string }) {
  const [aviso, setAviso] = useState<{ ok?: string; erro?: string; onde?: "ficha" | "contrato" }>({});
  const { dados, recarregar } = useDados(async () => {
    const sb = supabaseBrowser();
    const [{ data: ficha }, { data: contratos }, { data: planos }, { data: equipe }] = await Promise.all([
      sb.from("fichas").select("*").eq("portal_id", portalId).maybeSingle(),
      sb.from("contratos").select("*").eq("portal_id", portalId).order("inicio", { ascending: false }),
      sb.from("planos").select("*").order("ordem"),
      sb.from("perfis").select("id, nome, email, funcao, ultimo_acesso").eq("papel", "equipe").order("nome"),
    ]);
    return {
      ficha: ficha as Ficha | null, contratos: (contratos ?? []) as Contrato[],
      planos: (planos ?? []) as Plano[], equipe: (equipe ?? []) as PessoaEquipe[],
    };
  }, [portalId]);
  if (!dados) return null;
  const f = dados.ficha;
  const nomePlano = (id: string | null) => dados.planos.find((p) => p.id === id)?.nome ?? "—";
  const fazer = async (acao: () => Promise<void>, ok: string, onde: "ficha" | "contrato" = "contrato") => {
    try { await acao(); setAviso({ ok, onde }); recarregar(); } catch (e) { setAviso({ erro: (e as Error).message, onde }); }
  };
  const avisoEm = (onde: "ficha" | "contrato") => aviso.onde === onde && (
    <>
      {aviso.ok && <div className="aviso ok mt">{aviso.ok}</div>}
      {aviso.erro && <div className="aviso mt">{aviso.erro}</div>}
    </>
  );

  return (
    <div className="grade g2 mt" id="ficha">
      <form className="card" key={f?.updated_at ?? "nova"} action={(form) => fazer(() => fichaSalvar(portalId, form), "Ficha salva.", "ficha")}>
        <div className="linha entre">
          <h2 style={{ margin: 0 }}>Ficha da loja</h2>
          <span className="selo espera">só a equipe vê</span>
        </div>
        <div className="grade g2 mt" style={{ gap: 12 }}>
          <div>
            <label className="rotulo">Plano</label>
            <select name="plano_id" defaultValue={f?.plano_id ?? ""}>
              <option value="">—</option>
              {dados.planos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.vendendo ? "" : " (antigo)"}</option>)}
            </select>
            {f?.programa_notion && <div className="ajuda">No Notion: {f.programa_notion}</div>}
          </div>
          <div>
            <label className="rotulo">Situação</label>
            <select name="situacao" defaultValue={f?.situacao ?? "Em andamento"}>{SITUACOES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className="rotulo">Etapa da jornada</label>
            <select name="etapa" defaultValue={f?.etapa ?? ""}>
              <option value="">—</option>
              {ETAPAS_JORNADA.slice(1).map((e, i) => <option key={e} value={i + 1}>{i + 1} · {e}</option>)}
            </select>
          </div>
          <div>
            <label className="rotulo">Jornada</label>
            <select name="jornada" defaultValue={f?.jornada ?? ""}><option value="">—</option><option>Nova jornada</option><option>Contrato anterior</option></select>
          </div>
          <div>
            <label className="rotulo">Termômetro</label>
            <select name="termometro" defaultValue={f?.termometro ?? ""}><option value="">—</option>{TERMOMETROS.map((t) => <option key={t}>{t}</option>)}</select>
            {f?.termometro && <div className="ajuda"><span className={`selo ${corTermometro(f.termometro)}`}>{f.termometro}</span> desde {dia(f.termometro_em)}</div>}
          </div>
          <div>
            <label className="rotulo">Responsável (CS)</label>
            <select name="responsavel_cs" defaultValue={f?.responsavel_cs ?? ""}>
              <option value="">—</option>
              {dados.equipe.map((p) => <option key={p.id} value={p.id}>{p.nome ?? p.email}</option>)}
            </select>
          </div>
          <div><label className="rotulo">Data do diagnóstico</label><input type="date" name="data_diagnostico" defaultValue={f?.data_diagnostico ?? ""} /></div>
          <div><label className="rotulo">Instagram</label><input type="text" name="instagram" defaultValue={f?.instagram ?? ""} /></div>
        </div>
        <label className="rotulo">Resultado Nº 1 (Contrato de Foco)</label>
        <input type="text" name="resultado_n1" defaultValue={f?.resultado_n1 ?? ""} />
        <label className="rotulo">Indicador (início · hoje · meta)</label>
        <input type="text" name="indicador" defaultValue={f?.indicador ?? ""} placeholder="Ex.: R$ 80 mil · R$ 95 mil · R$ 120 mil" />
        <label className="rotulo">Condição especial</label>
        <input type="text" name="condicao_especial" defaultValue={f?.condicao_especial ?? ""} />
        <div className="grade g2" style={{ gap: 12 }}>
          <div><label className="rotulo">Grupo de WhatsApp</label><input type="url" name="grupo_whatsapp" defaultValue={f?.grupo_whatsapp ?? ""} /></div>
          <div><label className="rotulo">Pasta interna</label><input type="url" name="pasta_interna" defaultValue={f?.pasta_interna ?? ""} /></div>
        </div>
        <details className="mt">
          <summary style={{ cursor: "pointer" }}><b>Fundamentos implantados</b> · {f?.fundamentos.length ?? 0} de 16</summary>
          <div className="grade g2 mt" style={{ gap: 4 }}>
            {FUNDAMENTOS.map((x) => (
              <label key={x} className="marcar"><input type="checkbox" name="fundamentos" value={x} defaultChecked={f?.fundamentos.includes(x)} /><span>{x}</span></label>
            ))}
          </div>
        </details>
        <label className="rotulo">Observações</label>
        <textarea name="observacoes" defaultValue={f?.observacoes ?? ""} />
        {f?.notion_url && <p className="ajuda"><a href={f.notion_url} target="_blank" rel="noreferrer">Portal antigo no Notion</a></p>}
        {avisoEm("ficha")}
        <div className="linha mt"><button className="btn p" type="submit">Salvar ficha</button></div>
      </form>

      <div className="card">
        <h2>Contratos</h2>
        {dados.contratos.length === 0 && <p className="mudo">Nenhum contrato registrado.</p>}
        {dados.contratos.map((c) => (
          <details key={c.id} className="marcar" style={{ display: "block" }}>
            <summary style={{ cursor: "pointer" }}>
              <span className={`selo ${c.status === "Ativo" ? "feito" : "espera"}`} style={{ marginRight: 8 }}>{c.status}</span>
              <b>{nomePlano(c.plano_id)}</b> · {dia(c.inicio)} a {dia(c.fim)}{c.valor ? ` · ${moeda(Number(c.valor))}` : ""}
            </summary>
            <form className="mt" action={(form) => fazer(() => contratoSalvar(portalId, c.id, form), "Contrato salvo.")}>
              <CamposContrato c={c} planos={dados.planos} />
              <div className="linha mt">
                <button className="btn p peq" type="submit">Salvar</button>
                <button className="btn s peq" type="button" onClick={() => fazer(() => contratoApagar(c.id), "Contrato apagado.")}>Apagar</button>
              </div>
            </form>
          </details>
        ))}
        <details className="mt">
          <summary className="btn s peq" style={{ display: "inline-flex" }}>+ Novo contrato</summary>
          <form className="mt" action={(form) => fazer(() => contratoSalvar(portalId, null, form), "Contrato criado.")}>
            <CamposContrato planos={dados.planos} />
            <div className="linha mt"><button className="btn p peq" type="submit">Criar contrato</button></div>
          </form>
        </details>
        {avisoEm("contrato")}
      </div>
    </div>
  );
}
