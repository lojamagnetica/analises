import { Fragment } from "react";

// Markdown simples e seguro: ## títulos, **negrito**, listas com "- " e parágrafos.
function negrito(linha: string) {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

export function Texto({ md }: { md: string }) {
  const blocos = md.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="texto">
      {blocos.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i}>{b.slice(3)}</h2>;
        const linhas = b.split("\n");
        if (linhas.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{linhas.map((l, j) => <li key={j}>{negrito(l.slice(2))}</li>)}</ul>;
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
