"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { PERGUNTAS, buscarPessoas, perfilSalvar, type Letra } from "@/lib/pessoas";

// A ordem das opções muda de pergunta para pergunta, para a pessoa não "pegar o padrão".
const ORDENS: Letra[][] = [["D", "I", "S", "C"], ["S", "C", "D", "I"], ["I", "D", "C", "S"], ["C", "S", "I", "D"]];

function Teste() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal } = usePortal();
  const [respostas, setRespostas] = useState<(Letra | null)[]>(() => PERGUNTAS.map(() => null));
  const [por, setPor] = useState<"pessoa" | "gestor">("pessoa");
  const [erro, setErro] = useState("");
  const { dados } = useDados(() => buscarPessoas(portal.id), [portal.id]);
  if (!dados) return <Carregando />;
  const p = dados.pessoas.find((x) => x.id === id);
  if (!p) return <div className="card">Pessoa não encontrada.</div>;
  const faltam = respostas.filter((r) => !r).length;
  const nome = p.nome.split(" ")[0];

  return (
    <>
      <Titulo voltar={{ href: `/pessoas/pessoa?id=${p.id}`, rotulo: p.nome }} titulo={`Perfil de ${nome}`} sub="12 situações de loja. Em cada uma, escolha a frase que mais parece com a pessoa no dia a dia. Não existe resposta certa." />
      <div className="card mb">
        <label className="rotulo">Quem está respondendo?</label>
        <div className="linha">
          <label className="marcar"><input type="radio" name="por" checked={por === "pessoa"} onChange={() => setPor("pessoa")} /><span>{nome} responde (no seu celular)</span></label>
          <label className="marcar"><input type="radio" name="por" checked={por === "gestor"} onChange={() => setPor("gestor")} /><span>Eu respondo pelo que observo</span></label>
        </div>
        {por === "gestor" && <p className="ajuda">Responda como se fosse {nome}, pelo que você vê no dia a dia da loja.</p>}
      </div>
      {PERGUNTAS.map((q, i) => (
        <fieldset key={q.pergunta} className="card mb" style={{ border: 0 }}>
          <legend style={{ fontWeight: 700, color: "var(--ink)", padding: 0, marginBottom: 8 }}>{i + 1}. {q.pergunta}</legend>
          {ORDENS[i % 4].map((l) => (
            <label key={l} className="marcar">
              <input type="radio" name={`q${i}`} checked={respostas[i] === l} onChange={() => setRespostas((r) => r.map((x, j) => (j === i ? l : x)))} />
              <span>{q.opcoes[l]}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha">
        <button
          className="btn p"
          type="button"
          disabled={faltam > 0}
          onClick={async () => {
            setErro("");
            try { await perfilSalvar(p.id, respostas as Letra[], por); router.push(`/pessoas/pessoa?id=${p.id}`); } catch (e) { setErro((e as Error).message); }
          }}
        >{faltam ? `Faltam ${faltam}` : "Ver o perfil"}</button>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Teste /></Suspense>;
}
