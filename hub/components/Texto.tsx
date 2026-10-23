import { Fragment } from "react";

// Markdown simples e seguro: ## e ### títulos, **negrito**, [links](https://…), listas com "- ",
// tabelas com "|", avisos com "> " e parágrafos.
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
  const blocos = md.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="texto">
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
    </div>
  );
}
