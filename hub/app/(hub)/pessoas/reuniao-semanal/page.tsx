"use client";

import Link from "next/link";
import { useState } from "react";
import { CampoNumero, lerNumero } from "@/components/Numero";
import { Copiar } from "@/components/Copiar";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { hoje, dia } from "@/lib/formato";
import { buscarPessoas, leitura, pautaSemanal, reuniaoSalvar, type NumerosPessoa } from "@/lib/pessoas";
import { INDICADOR_DA_ACAO } from "@/lib/gincanas";

type Linha = { venda: string; meta: string; ticket: string; pa: string; conversao: string };
const COLUNAS: [keyof Linha, string, string][] = [["venda", "Venda", "R$"], ["meta", "Meta da semana", "R$"], ["ticket", "Ticket", "R$"], ["pa", "PA", "1,6"], ["conversao", "Conversão %", "opcional"]];

export default function ReuniaoSemanal() {
  const { portal } = usePortal();
  const [data, setData] = useState(hoje());
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [t, setT] = useState({ funcionou: "", travou: "", foco: "", destaqueId: "", fez: "", importou: "", oque: "", quanto: "", ate: "", como: "" });
  const [salvo, setSalvo] = useState(false);
  const { dados, recarregar } = useDados(() => buscarPessoas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const vazia: Linha = { venda: "", meta: "", ticket: "", pa: "", conversao: "" };
  const numeros: NumerosPessoa[] = ativos.map((p) => {
    const l = linhas[p.id] ?? vazia;
    return { pessoa_id: p.id, nome: p.nome, venda: lerNumero(l.venda), meta: lerNumero(l.meta), ticket: lerNumero(l.ticket), pa: lerNumero(l.pa), conversao: l.conversao ? lerNumero(l.conversao) : null };
  });
  const sugestoes = [...new Set(leitura(numeros).flatMap((x) => x.acoes.map((a) => a.split("→ ")[1])))];
  const destaque = ativos.find((p) => p.id === t.destaqueId);
  const pauta = pautaSemanal({
    data, linhas: numeros, funcionou: t.funcionou, travou: t.travou, foco: t.foco,
    destaque: destaque ? { nome: destaque.nome.split(" ")[0], fez: t.fez, importou: t.importou } : null,
    combinado: { oque: t.oque, quanto: t.quanto, ate: t.ate, como: t.como },
  });
  const anteriores = dados.reunioes.filter((r) => r.tipo === "semanal");
  const muda = (k: keyof typeof t) => (e: { target: { value: string } }) => { setT({ ...t, [k]: e.target.value }); setSalvo(false); };

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Reunião semanal" sub="Reunião de números · 20 a 30 min. Lance os números de cada pessoa e o Hub monta a pauta com o foco da semana." />
      {!ativos.length && <div className="card mb">Cadastre a sua equipe primeiro. <Link href="/pessoas">Ir para Minha equipe →</Link></div>}
      <div className="card mb">
        <div className="linha entre"><h2 style={{ margin: 0 }}>Os números da semana, por pessoa</h2><input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ maxWidth: 170 }} /></div>
        <p className="mudo">O número da loja esconde quem está carregando o time e quem precisa de ajuda.</p>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead><tr><th>Pessoa</th>{COLUNAS.map(([, r]) => <th key={r}>{r}</th>)}</tr></thead>
            <tbody>
              {ativos.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.nome}</b></td>
                  {COLUNAS.map(([k, r, d]) => (
                    <td key={k}><CampoNumero rotulo={`${r} de ${p.nome}`} dica={d} valor={(linhas[p.id] ?? vazia)[k]} aoMudar={(v) => { setLinhas({ ...linhas, [p.id]: { ...(linhas[p.id] ?? vazia), [k]: v } }); setSalvo(false); }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grade g2">
        <div className="card">
          <label className="rotulo">O que funcionou</label><textarea rows={2} value={t.funcionou} onChange={muda("funcionou")} />
          <label className="rotulo">O que travou</label><textarea rows={2} value={t.travou} onChange={muda("travou")} />
          <label className="rotulo">O foco da semana (um só)</label>
          <input type="text" value={t.foco} onChange={muda("foco")} placeholder={sugestoes[0] ?? "Ex.: oferecer a segunda peça em todo atendimento"} list="sugestoes-foco" />
          <datalist id="sugestoes-foco">{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>
          <label className="rotulo">Destaque da semana</label>
          <select value={t.destaqueId} onChange={muda("destaqueId")}>
            <option value="">Escolha quem reconhecer</option>
            {ativos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {t.destaqueId && (
            <div className="grade g2" style={{ gap: 12 }}>
              <div><label className="rotulo">O que fez</label><input type="text" value={t.fez} onChange={muda("fez")} placeholder="ofereceu o cinto e a cliente levou o look" /></div>
              <div><label className="rotulo">O que importou</label><input type="text" value={t.importou} onChange={muda("importou")} placeholder="O ticket dela subiu" /></div>
            </div>
          )}
          <label className="rotulo">Combinado da semana</label>
          <div className="grade g2" style={{ gap: 12 }}>
            <input type="text" value={t.oque} onChange={muda("oque")} placeholder="O quê (comportamento que dá para ver)" />
            <input type="text" value={t.quanto} onChange={muda("quanto")} placeholder="Quanto (número que dá para contar)" />
            <input type="text" value={t.ate} onChange={muda("ate")} placeholder="Até quando (dia marcado)" />
            <input type="text" value={t.como} onChange={muda("como")} placeholder="Como vou olhar (quando e onde)" />
          </div>
        </div>
        <div className="card card-borda" style={{ ["--c" as string]: "var(--orange)" }}>
          <h2>A pauta</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{pauta}</pre>
          <div className="linha mt">
            <Copiar texto={pauta} rotulo="Copiar pauta" />
            <button className="btn s peq" type="button" disabled={salvo || !ativos.length} onClick={async () => {
              await reuniaoSalvar(portal.id, "semanal", data, { linhas: numeros, ...t }, pauta); setSalvo(true); recarregar();
            }}>{salvo ? "Registrada ✓" : "Registrar reunião"}</button>
          </div>
          {sugestoes[0] && INDICADOR_DA_ACAO[sugestoes[0]] && <p className="ajuda">Para o foco da semana: <Link href={`/pessoas/gincanas?ind=${encodeURIComponent(INDICADOR_DA_ACAO[sugestoes[0]])}`}>gincanas de {INDICADOR_DA_ACAO[sugestoes[0]]} →</Link></p>}
          <p className="ajuda">Duas reuniões seguidas registradas são a prova do fundamento 02.4 · Reunião semanal no Curso.</p>
        </div>
      </div>

      {anteriores.length > 0 && (
        <>
          <div className="secao">Reuniões registradas</div>
          <div className="card">
            {anteriores.map((r) => (
              <details key={r.id} className="marcar" style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>{dia(r.data)}</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13.5 }}>{r.pauta}</pre>
              </details>
            ))}
          </div>
        </>
      )}
    </>
  );
}
