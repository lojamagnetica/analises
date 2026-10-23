"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Titulo } from "@/components/Titulo";
import { Carregando, useHub } from "@/lib/hub";
import { salvarNome } from "@/lib/acoes";
import { Senha } from "./Senha";
import { Foto } from "./Foto";

function Conta() {
  const senha = useSearchParams().get("senha");
  const hub = useHub();
  const [salvo, setSalvo] = useState(false);
  return (
    <>
      <Titulo titulo="Minha conta" sub={hub.email} />
      {senha && <div className="aviso ok mb">Bem-vindo(a)! Crie a sua senha para os próximos acessos.</div>}
      <Foto />
      <div className="grade g2">
        <form className="card" action={async (f) => { await salvarNome(f); await hub.recarregar(); setSalvo(true); }}>
          <h3>Seu nome</h3>
          <input type="text" name="nome" defaultValue={hub.nome} />
          {salvo && <div className="aviso ok mt">Nome salvo.</div>}
          <div className="linha mt"><button className="btn p" type="submit">Salvar</button></div>
        </form>
        <Senha destaque={!!senha} />
      </div>
      <div className="card mt" id="app">
        <h3>Instalar o Hub como app</h3>
        <p className="mudo">
          <b>iPhone:</b> abra o Hub no Safari, toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.<br />
          <b>Android:</b> abra no Chrome, toque nos três pontinhos e depois em &quot;Instalar app&quot;.<br />
          <b>Computador:</b> no Chrome, clique no ícone de instalar na barra de endereço.
        </p>
      </div>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><Conta /></Suspense>;
}
