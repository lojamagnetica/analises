"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PerguntasDisc, faltamDisc, type MaisMenos } from "@/components/PerguntasDisc";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, usePortal } from "@/lib/hub";
import { buscarMetodo, buscarPessoas, perfilSalvar, perguntasDaFuncao, type Letra } from "@/lib/pessoas";
import { liberado } from "@/lib/entrada";

function Teste() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { portal, entrada, equipe } = usePortal();
  // Antes do Diagnóstico, a ficha da pessoa ainda está fechada: volta para a etapa Time de vendas.
  const fichaAberta = equipe || !entrada || liberado("diagnostico", entrada);
  const [r, setR] = useState<MaisMenos>({ mais: [], menos: [] });
  const [por, setPor] = useState<"pessoa" | "gestor">("gestor");
  const [erro, setErro] = useState("");
  const { dados } = useDados(async () => ({ ...(await buscarPessoas(portal.id)), m: await buscarMetodo() }), [portal.id]);
  if (!dados) return <Carregando />;
  const p = dados.pessoas.find((x) => x.id === id);
  if (!p) return <div className="card">Pessoa não encontrada.</div>;
  const PERGUNTAS = perguntasDaFuncao(dados.m, p.funcao);
  const faltam = faltamDisc(PERGUNTAS, r);
  const nome = p.nome.split(" ")[0];

  return (
    <>
      <Titulo voltar={fichaAberta ? { href: `/pessoas/pessoa?id=${p.id}`, rotulo: p.nome } : { href: "/personalizacao/etapa?n=5", rotulo: "Time de vendas" }} titulo={`Perfil de ${nome}`}
        sub={`${PERGUNTAS.length} situações do dia a dia. Em cada uma, marque a frase que MAIS parece e a que MENOS parece com a pessoa no dia a dia. Não existe resposta certa.`} />
      <div className="card mb">
        <label className="rotulo">Quem está respondendo?</label>
        <div className="linha">
          <label className="marcar"><input type="radio" name="por" checked={por === "gestor"} onChange={() => setPor("gestor")} /><span>Eu respondo pelo que observo</span></label>
          <label className="marcar"><input type="radio" name="por" checked={por === "pessoa"} onChange={() => setPor("pessoa")} /><span>{nome} responde aqui, comigo</span></label>
        </div>
        <p className="ajuda">{por === "gestor"
          ? `Responda como se fosse ${nome}, pelo que você vê no dia a dia da loja.`
          : `Para ${nome} responder sozinha no celular, sem ver o resto do portal, volte e use "Enviar o teste pelo link".`}</p>
      </div>
      <PerguntasDisc perguntas={PERGUNTAS} r={r} mudar={setR} quem={nome} />
      {erro && <div className="aviso mb">{erro}</div>}
      <div className="linha">
        <button
          className="btn p"
          type="button"
          disabled={faltam > 0}
          onClick={async () => {
            setErro("");
            try {
              await perfilSalvar(p.id, r.mais as Letra[], r.menos as Letra[], por);
              router.push(fichaAberta ? `/pessoas/pessoa?id=${p.id}` : "/personalizacao/etapa?n=5");
            } catch (e) { setErro((e as Error).message); }
          }}
        >{faltam ? `Faltam ${faltam}` : "Ver o perfil"}</button>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Teste /></Suspense>;
}
