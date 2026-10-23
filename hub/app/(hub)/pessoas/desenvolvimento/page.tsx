"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { ESTAGIOS, HABILIDADES, PERFIS, buscarPessoas, fichaSalvar, principal, type Estagio, type Ficha } from "@/lib/pessoas";

const em30 = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

function FormFicha({ f, pessoaInicial, pessoas, aoSalvar }: { f?: Ficha; pessoaInicial?: string; pessoas: { id: string; nome: string; perfil: Parameters<typeof principal>[0] }[]; aoSalvar: (form: FormData) => Promise<void> }) {
  const [pessoa, setPessoa] = useState(f?.pessoa_id ?? pessoaInicial ?? "");
  const [estagio, setEstagio] = useState<Estagio>(f?.estagio ?? "Começando");
  const [hab, setHab] = useState(f?.competencia ?? "");
  const [treino, setTreino] = useState(f?.acoes ?? "");
  const [medida, setMedida] = useState(f?.objetivo ?? "");
  const [erro, setErro] = useState("");
  const pr = principal(pessoas.find((p) => p.id === pessoa)?.perfil ?? null);
  const escolher = (nome: string) => {
    setHab(nome);
    const h = HABILIDADES.find((x) => x.nome === nome);
    if (h && !f) { setTreino(h.treino); setMedida(h.medida); }
  };
  const h = HABILIDADES.find((x) => x.nome === hab);
  return (
    <form action={async (form) => { setErro(""); try { await aoSalvar(form); } catch (e) { setErro((e as Error).message); } }}>
      <div className="grade g2" style={{ gap: 12 }}>
        <div>
          <label className="rotulo">Nome</label>
          <select name="pessoa_id" value={pessoa} onChange={(e) => setPessoa(e.target.value)} required>
            <option value="">Escolha a pessoa</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Estágio hoje (nesta habilidade)</label>
          <select name="estagio" value={estagio} onChange={(e) => setEstagio(e.target.value as Estagio)}>
            {(Object.keys(ESTAGIOS) as Estagio[]).map((s) => <option key={s} value={s}>{s} · {ESTAGIOS[s].sinal}</option>)}
          </select>
        </div>
      </div>
      <label className="rotulo">Habilidade do mês</label>
      <input type="text" name="competencia" list="habilidades" value={hab} onChange={(e) => escolher(e.target.value)} required placeholder="Escolha da lista ou escreva" />
      <datalist id="habilidades">{HABILIDADES.map((x) => <option key={x.nome} value={x.nome} />)}</datalist>
      <label className="rotulo">Como vou treinar</label>
      <textarea name="acoes" rows={2} value={treino} onChange={(e) => setTreino(e.target.value)} required />
      <p className="ajuda">No estágio {estagio}, o líder {ESTAGIOS[estagio].lider}.{pr ? ` Com o perfil ${PERFIS[pr.letra].nome}: ${PERFIS[pr.letra].ensinar}` : ""}</p>
      <label className="rotulo">Como vou saber que aprendeu (um número)</label>
      <input type="text" name="objetivo" value={medida} onChange={(e) => setMedida(e.target.value)} required />
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Revisar até</label><input type="date" name="prazo" defaultValue={f?.prazo ?? em30()} /></div>
        <div>
          <label className="rotulo">Situação</label>
          <select name="status" defaultValue={f?.status ?? "Em andamento"}><option>Em andamento</option><option>Concluído</option></select>
        </div>
      </div>
      <label className="rotulo">Conversas de acompanhamento (a cada 15 dias)</label>
      <textarea name="acompanhamento" rows={2} defaultValue={f?.acompanhamento ?? ""} placeholder="Ex.: 05/11 · PA foi de 1,4 para 1,6. Segue no passo 3." />
      {h?.aula && <p className="ajuda">No Curso: <Link href={`/cursos/fundamento?c=${h.aula}`}>fundamento {h.aula}</Link> tem a aula e as ferramentas desta habilidade.</p>}
      {erro && <div className="aviso mt">{erro}</div>}
      <div className="linha mt"><button className="btn p" type="submit">Salvar ficha</button></div>
    </form>
  );
}

function Desenvolvimento() {
  const pessoaInicial = useSearchParams().get("pessoa") ?? "";
  const { portal } = usePortal();
  const [nova, setNova] = useState(!!pessoaInicial);
  const { dados, recarregar } = useDados(() => buscarPessoas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const ativos = dados.pessoas.filter((p) => p.ativo);
  const nome = (id: string) => dados.pessoas.find((p) => p.id === id)?.nome ?? "—";
  const andamento = dados.fichas.filter((f) => f.status === "Em andamento");
  const semFicha = ativos.filter((p) => !andamento.some((f) => f.pessoa_id === p.id));

  return (
    <>
      <Titulo voltar={{ href: "/pessoas", rotulo: "Minha equipe" }} titulo="Desenvolvimento da equipe" sub="Desenvolver não é um treinamento por ano. É uma habilidade por mês, por pessoa, revisada na conversa de cada 15 dias." />
      <div className="grade g2 mb">
        <div className="card">
          <h2>Ensinar em 4 passos</h2>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>Eu faço, você vê</li><li>Fazemos juntos</li><li>Você faz, eu vejo (corrija com calma, sem plateia)</li><li>Você faz sozinho(a)</li>
          </ol>
          <p className="ajuda">Uma coisa por vez. Treino curto, no balcão, com cliente real ou simulação de 10 minutos antes de abrir. O erro clássico é pular do passo 1 para o 4.</p>
        </div>
        <div className="card">
          <h2>Estágios (por habilidade, não por pessoa)</h2>
          {(Object.keys(ESTAGIOS) as Estagio[]).map((s) => <p key={s} style={{ margin: "0 0 6px" }}><b>{s}</b> ({ESTAGIOS[s].sinal}): o líder {ESTAGIOS[s].lider}.</p>)}
          <p className="ajuda">A mesma pessoa pode estar pronta na abordagem e começando no pós-venda.</p>
        </div>
      </div>

      <div className="linha entre mb">
        <div className="secao" style={{ margin: 0 }}>Habilidades do mês · {andamento.length}</div>
        <button className="btn p" type="button" onClick={() => setNova(!nova)} disabled={!ativos.length}>+ Nova ficha</button>
      </div>
      {!ativos.length && <div className="card mb">Cadastre a sua equipe primeiro. <Link href="/pessoas">Ir para Minha equipe →</Link></div>}
      {nova && (
        <div className="card mb">
          <FormFicha pessoaInicial={pessoaInicial} pessoas={ativos} aoSalvar={async (form) => { await fichaSalvar(portal.id, null, form); setNova(false); recarregar(); }} />
        </div>
      )}
      {semFicha.length > 0 && andamento.length > 0 && <div className="aviso mb">Sem habilidade do mês: {semFicha.map((p) => p.nome.split(" ")[0]).join(", ")}.</div>}

      <div className="grade g2">
        {dados.fichas.map((f) => (
          <details key={f.id} className="card" open={false}>
            <summary style={{ cursor: "pointer", listStyle: "none" }}>
              <div className="linha entre">
                <b style={{ color: "var(--ink)" }}>{nome(f.pessoa_id)}</b>
                <span className={`selo ${f.status === "Concluído" ? "feito" : "andamento"}`}>{f.status}</span>
              </div>
              <div style={{ marginTop: 6 }}><b>{f.competencia}</b> · {f.estagio}</div>
              <div className="mudo" style={{ fontSize: 13.5 }}>Treino: {f.acoes}</div>
              <div className="mudo" style={{ fontSize: 13.5 }}>Medida: {f.objetivo}{f.prazo ? ` · revisar até ${dia(f.prazo)}` : ""}</div>
            </summary>
            <div className="mt">
              <FormFicha f={f} pessoas={ativos} aoSalvar={async (form) => { await fichaSalvar(portal.id, f.id, form); recarregar(); }} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Desenvolvimento /></Suspense>;
}
