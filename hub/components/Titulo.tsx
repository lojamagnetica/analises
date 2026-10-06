import Link from "next/link";
import { Icone } from "@/components/Icone";

export function Titulo({ titulo, sub, voltar }: { titulo: React.ReactNode; sub?: React.ReactNode; voltar?: { href: string; rotulo: string } }) {
  return (
    <div className="titulo-pagina">
      {voltar && (
        <Link className="voltar" href={voltar.href}>
          <Icone nome="back" tamanho={16} /> {voltar.rotulo}
        </Link>
      )}
      <h1 style={{ marginTop: voltar ? 8 : 0 }}>{titulo}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
