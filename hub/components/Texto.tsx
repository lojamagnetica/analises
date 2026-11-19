import { Fragment } from "react";
import { CopiarMensagem } from "@/components/CopiarMensagem";

// Markdown simples e seguro: ## e ### títulos, **negrito**, [links](https://…), listas com "- ",
// tabelas com "|", avisos com "> ", parágrafos e mensagens prontas entre ``` (com botão Copiar).
function negrito(linha: string) {
  return linha.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

const celulas = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Texto({ md }: { md: string }) {
  // Blocos entre ``` viram mensagem para copiar; o resto segue as regras de sempre.
  const partes = md.replace(/\r/g, "").split(/^```[^\n]*\n([\s\S]*?)\n```[ \t]*$/m);
  return (
    <div className="texto">
      {partes.map((parte, k) => (k % 2 === 1
        ? <CopiarMensagem key={`m${k}`} texto={parte} />
        : <Fragment key={`t${k}`}>{blocosDe(parte)}</Fragment>))}
    </div>
  );
}

function blocosDe(md: string) {
  const blocos = md.trim() ? md.trim().split(/\n{2,}/) : [];
  return (
    <>
      {blocos.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>;
        if (b.startsWith("### ")) return <h3 key={i}>{b.slice(4)}</h3>;
        const linhas = b.split("\n");
        if (linhas.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{linhas.map((l, j) => <li key={j}>{negrito(l.slice(2))}</li>)}</ul>;
        }
        if (linhas.length > 1 && linhas.every((l) => l.trim().startsWith("|"))) {
          const [cab, ...resto] = linhas.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l));
          return (
            <div className="tabela-wrap" key={i}>
              <table className="tabela">
                <thead><tr>{celulas(cab).map((c, j) => <th key={j}>{negrito(c)}</th>)}</tr></thead>
                <tbody>{resto.map((l, j) => <tr key={j}>{celulas(l).map((c, k) => <td key={k}>{negrito(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        if (linhas.every((l) => l.startsWith(">"))) {
          return <div className="aviso" key={i} style={{ margin: "0 0 .9em" }}>{linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{negrito(l.replace(/^>\s?/, ""))}</Fragment>)}</div>;
        }
        return (
          <p key={i}>
            {linhas.map((l, j) => (
              <Fragment key={j}>{j > 0 && <br />}{negrito(l)}</Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
