import { Titulo } from "@/components/Titulo";

export const metadata = { title: "Gestão de clientes" };

export default function Clientes() {
  return (
    <>
      <Titulo titulo="Gestão de clientes" sub="Em breve: a base de clientes da loja, com aniversário, última compra, curva A/B/C e a lista de inativas para reativação." />
      <div className="card mudo">Este módulo entra na próxima fase do Hub.</div>
    </>
  );
}
