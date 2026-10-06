import { Titulo } from "@/components/Titulo";
import { contextoPortal, personalizacao } from "@/lib/contexto";
import { Calculadora } from "./Calculadora";

export const metadata = { title: "Metas e calculadora" };

export default async function Metas() {
  const { portal } = await contextoPortal();
  const pers = await personalizacao(portal.id);
  const n = (etapa: number, campo: string, padrao: number) => {
    const v = Number(pers.get(etapa)?.respostas?.[campo]);
    return Number.isFinite(v) && v > 0 ? v : padrao;
  };
  return (
    <>
      <Titulo titulo="Metas e calculadora" sub="Da meta do mês para o que precisa acontecer todo dia. Os valores iniciais vêm da sua Personalização." />
      <Calculadora
        inicial={{
          meta: n(6, "meta_mensal", 60000), dias: n(6, "dias_abertos", 26), ticket: n(6, "ticket", 280),
          conversao: n(6, "conversao", 30), markup: n(4, "markup", 2.6),
        }}
      />
    </>
  );
}
