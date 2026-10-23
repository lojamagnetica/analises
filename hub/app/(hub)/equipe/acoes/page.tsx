"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CamposAcao } from "@/components/CamposAcao";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { dia } from "@/lib/formato";
import { acaoSalvar, buscarAcoes, situacao } from "@/lib/acoes-mes";

export default function AcoesEquipe() {
  useEquipe();
  const router = useRouter();
  const [nova, setNova] = useState(false);
  const [erro, setErro] = useState("");
  const { dados } = useDados(buscarAcoes, []);
  if (!dados) return <Carregando />;
  return (
    <>
      <Titulo titulo="Ações do Mês" sub="Monte cada ação validada uma vez. Publicada, ela aparece em todos os portais com cronograma, materiais e placar." />
      <div className="linha mb"><button className="btn p" type="button" onClick={() => setNova(!nova)}>+ Nova ação</button></div>
      {nova && (
        <form className="card mb" action={async (f) => {
          setErro("");
          try { const id = await acaoSalvar(null, f); router.push(`/equipe/acao?id=${id}`); } catch (e) { setErro((e as Error).message); }
        }}>
          <CamposAcao />
          {erro && <div className="aviso mt">{erro}</div>}
          <div className="linha mt"><button className="btn p" type="submit">Criar ação</button></div>
        </form>
      )}
      <div className="card tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Ação</th><th>Data</th><th>Situação</th><th>Portais</th><th /></tr></thead>
          <tbody>
            {dados.length === 0 && <tr><td colSpan={5} className="mudo">Nenhuma ação ainda.</td></tr>}
            {dados.map((a) => (
              <tr key={a.id}>
                <td><b>{a.titulo}</b></td>
                <td>{dia(a.data_acao)}</td>
                <td><span className={`selo ${situacao(a).classe}`}>{situacao(a).texto}</span></td>
                <td>{a.publicada ? <span className="selo feito">publicada</span> : <span className="selo alerta">rascunho</span>}</td>
                <td><Link className="btn s peq" href={`/equipe/acao?id=${a.id}`}>Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
