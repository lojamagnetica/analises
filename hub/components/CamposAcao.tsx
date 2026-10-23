import { escreverDecisoes, type Acao } from "@/lib/acoes-mes";

export function CamposAcao({ a }: { a?: Acao }) {
  return (
    <>
      <label className="rotulo">Título</label>
      <input type="text" name="titulo" required defaultValue={a?.titulo ?? ""} />
      <div className="grade g4" style={{ gap: 12 }}>
        <div><label className="rotulo">Começa a preparação</label><input type="date" name="inicio" required defaultValue={a?.inicio ?? ""} /></div>
        <div><label className="rotulo">Primeiro dia de venda</label><input type="date" name="venda_inicio" defaultValue={a?.venda_inicio ?? ""} /></div>
        <div><label className="rotulo">Dia principal</label><input type="date" name="data_acao" required defaultValue={a?.data_acao ?? ""} /></div>
        <div><label className="rotulo">Último dia de venda</label><input type="date" name="fim" required defaultValue={a?.fim ?? ""} /></div>
      </div>
      <label className="rotulo">Por que funciona</label>
      <textarea name="resumo" rows={3} defaultValue={a?.resumo ?? ""} />
      <label className="rotulo">Para quem</label>
      <textarea name="publico" rows={3} defaultValue={a?.publico ?? ""} />
      <label className="rotulo">A oferta e as regras de ouro</label>
      <textarea name="oferta" rows={6} defaultValue={a?.oferta ?? ""} />
      <label className="rotulo">Dados do mercado (com as fontes)</label>
      <textarea name="contexto" rows={3} defaultValue={a?.contexto ?? ""} />
      <label className="rotulo">Decisões do plano (uma por linha: Pergunta: opção 1 | opção 2)</label>
      <textarea name="decisoes" rows={3} defaultValue={a ? escreverDecisoes(a.decisoes) : ""} placeholder="Meu perfil: Perfil 1 · Estoque parado | Perfil 2 · Estoque saudável" />
      <div className="grade g2" style={{ gap: 12 }}>
        <div><label className="rotulo">Aumento para a meta sugerida (%)</label><input type="number" name="aumento" defaultValue={a?.aumento ?? 30} /></div>
      </div>
      <p className="ajuda">Meta sugerida para a loja = venda de um dia normal × dias de venda + este aumento. Textos aceitam - para listas e **negrito**.</p>
    </>
  );
}
