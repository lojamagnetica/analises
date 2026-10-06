import { Titulo } from "@/components/Titulo";
import { contexto } from "@/lib/contexto";
import { salvarNome } from "../acoes";
import { Senha } from "./Senha";

export const metadata = { title: "Minha conta" };

export default async function Conta({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  const ctx = await contexto();
  return (
    <>
      <Titulo titulo="Minha conta" sub={ctx.email} />
      {senha && <div className="aviso ok mb">Bem-vindo(a)! Crie a sua senha para os próximos acessos.</div>}
      <div className="grade g2">
        <form className="card" action={salvarNome}>
          <h3>Seu nome</h3>
          <input type="text" name="nome" defaultValue={ctx.nome} />
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
