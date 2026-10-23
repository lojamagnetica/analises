"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, usePortal } from "@/lib/hub";
import { ETAPAS } from "@/lib/conteudo";
import { salvarEtapa } from "@/lib/acoes";

function Etapa() {
  const router = useRouter();
  const etapa = ETAPAS.find((e) => e.numero === Number(useSearchParams().get("n")));
  const { portal, pers, recarregar } = usePortal();
  const [salvando, setSalvando] = useState(false);
  if (!etapa) return <div className="card">Etapa não encontrada.</div>;
  const r = pers.get(etapa.numero)?.respostas ?? {};
  const valor = (id: string) => (typeof r[id] === "string" ? (r[id] as string) : id === "loja" ? portal.loja : "");
  const lista = (id: string) => (Array.isArray(r[id]) ? (r[id] as string[]) : []);

  return (
    <>
      <Titulo voltar={{ href: "/personalizacao", rotulo: "Personalização" }} titulo={`${etapa.numero}. ${etapa.titulo}`} sub={etapa.descricao} />
      <form
        className="card"
        style={{ maxWidth: 720 }}
        action={async (form) => {
          setSalvando(true);
          await salvarEtapa(portal.id, etapa.numero, form);
          await recarregar();
          router.push(`/personalizacao?salvo=${etapa.numero}`);
        }}
      >
        {etapa.campos.map((c) => (
          <div key={c.id}>
            <label className="rotulo" htmlFor={c.id}>{c.rotulo}</label>
            {c.tipo === "textarea" ? (
              <textarea id={c.id} name={c.id} defaultValue={valor(c.id)} />
            ) : c.tipo === "opcao" ? (
              <select id={c.id} name={c.id} defaultValue={valor(c.id)}>
                <option value="">Escolha…</option>
                {c.opcoes!.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : c.tipo === "multi" ? (
              c.opcoes!.map((o) => (
                <label key={o} className="marcar">
                  <input type="checkbox" name={c.id} value={o} defaultChecked={lista(c.id).includes(o)} />
                  <span>{o}</span>
                </label>
              ))
            ) : (
              <input id={c.id} name={c.id} type={c.tipo === "numero" ? "number" : "text"} step="any" defaultValue={valor(c.id)} />
            )}
            {c.ajuda && <div className="ajuda">{c.ajuda}</div>}
          </div>
        ))}
        <div className="linha mt"><button className="btn p" type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar etapa"}</button></div>
      </form>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Etapa /></Suspense>;
}
