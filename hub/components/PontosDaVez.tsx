"use client";

import type { PontosDaPessoa } from "@/lib/vez";

/** As regras dos pontos, as mesmas para a equipe (link pessoal) e para a gestora. */
export function RegrasDosPontos() {
  return (
    <div style={{ fontSize: 15 }}>
      <p style={{ margin: "0 0 6px" }}><b>Todo mundo pode ganhar.</b> Quem usa certo e cumpre as missões em dia vai somando pontos.</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <li><b>Cada missão do dia vale 10 pontos</b>, em média. Marque no mesmo dia.</li>
        <li><b>Missões do dia completas = 1 estrela</b> ⭐</li>
        <li><b>Lojinha de resgate:</b> a cada 100 pontos você já troca por um mimo (garrafinha, maquiagem, skincare, brindes das marcas). Roupa não entra.</li>
        <li><b>Voucher de R$ 500 em compras com 500 pontos.</b> Com 1.000 pontos são dois vouchers, e eles se acumulam.</li>
        <li><b>Semana em dia = +50 pontos e 20 estrelas ⭐.</b> Preencha o resultado de pelo menos 80% dos atendimentos da lista da vez (a partir de 5 atendimentos na semana).</li>
        <li><b>Indique e ganhe, em novembro e dezembro:</b> a vendedora do feminino indica uma cliente para o masculino, ou a do masculino para o feminino (a Sther, no caixa, também vale). Se a cliente comprar, quem indicou ganha <b>+20 pontos e 20 estrelas ⭐</b>.</li>
        <li><b>Clientes da semana cadastrados completos = +20 pontos.</b> Vale para quem cadastra, normalmente a Sther na Morena e a Thamy na For Men: nome, WhatsApp e aniversário de todas as clientes cadastradas na semana.</li>
        <li><b>Caixas e relatórios da semana preenchidos = +20 pontos</b>, para quem cuida do caixa da loja (segunda a sábado, mais a conferência da semana).</li>
        <li><b>Entre as lojas da mentoria 🏅:</b> a loja que somar mais pontos no mês (a soma dos pontos de cada pessoa) ganha <b>R$ 200 extra da mentora</b>, se bater a meta do mês. Empate entre 2: as duas ganham. Mais de 2: as 2 que chegaram primeiro.</li>
        <li><b>Desafio do dia 🔥:</b> todo dia um desafio novo, que vale pontos para todo mundo. Ele aparece no topo do link: cada vez que você cumpre, é só marcar.</li>
        <li><b>Destaque do mês 🏆:</b> quem somar mais estrelas no mês ganha <b>R$ 200 em dinheiro</b> e já começa o mês seguinte com <b>100 pontos</b>.</li>
        <li><b>Em breve:</b> pontos das tarefas de rotina de cada pessoa.</li>
      </ul>
    </div>
  );
}

/** O card de pontos no link pessoal da Lista da vez. */
export function PontosDaVez({ p, vibrar = false }: { p: PontosDaPessoa; vibrar?: boolean }) {
  const falta = 500 - (p.saldo % 500);
  const pct = Math.min(100, ((p.saldo % 500) / 500) * 100);
  const sem = p.semana.atend > 0 ? Math.round((p.semana.feitos / p.semana.atend) * 100) : null;
  return (
    <div className="card mb">
      <div className="linha entre" style={{ alignItems: "baseline" }}>
        <b style={{ fontSize: 18 }}>Meus pontos</b>
        <span title="Estrelas" style={{ fontSize: 16, fontWeight: 700 }}>⭐ {p.estrelas}{p.estrela_hoje ? " · hoje ✓" : ""}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <span className={vibrar ? "vez-vibra" : undefined} style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{p.saldo}</span><span className="mudo">pontos</span>
        {p.vouchers > 0 && <span className="selo feito" style={{ marginLeft: "auto" }}>{p.vouchers} {p.vouchers === 1 ? "voucher" : "vouchers"} de R$ 500</span>}
      </div>
      <div style={{ height: 12, borderRadius: 6, background: "var(--line)", marginTop: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--orange)", transition: "width .6s" }} />
      </div>
      <small className="mudo">Faltam <b>{falta}</b> pontos para um voucher de R$ 500 em compras.</small>
      <div style={{ marginTop: 10, background: "var(--soft)", borderRadius: 12, padding: "8px 12px", fontSize: 14 }}>
        <b>🏆 Destaque do mês:</b> você tem <b>{p.destaque.estrelas} ⭐</b> em {p.destaque.mes}.{" "}
        {p.destaque.lider_estrelas === 0 ? "Ninguém somou estrelas ainda. Dá para ser a primeira!"
          : p.destaque.posicao === 1 ? "Você está em 1º lugar! 🥇"
          : `${p.destaque.lider} lidera com ${p.destaque.lider_estrelas} ⭐.`}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 14 }}>
        Esta semana: {p.semana.atend === 0 ? "nenhum atendimento registrado ainda." : <>{p.semana.feitos} de {p.semana.atend} atendimentos com resultado ({sem}%). {p.semana.bonus ? "Bônus de +50 garantido! 🎉" : "Com 80% ou mais, são +50 pontos."}</>}
      </p>
      {p.hist.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
          <small className="mudo">Últimos pontos</small>
          {p.hist.slice(0, 4).map((h, i) => (
            <div key={i} className="linha entre" style={{ fontSize: 14, marginTop: 4, gap: 8 }}>
              <span style={{ flex: 1 }}>{h.texto}</span><b style={{ color: h.pontos < 0 ? "var(--muted)" : "#2E9D57" }}>{h.pontos !== 0 ? `${h.pontos > 0 ? "+" : ""}${h.pontos}` : ""}{h.estrelas > 1 ? ` · +${h.estrelas} ⭐` : h.estrelas === 1 && h.pontos === 0 ? "+1 ⭐" : ""}</b>
            </div>
          ))}
        </div>
      )}
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Como ganhar pontos</summary>
        <div style={{ marginTop: 8 }}><RegrasDosPontos /></div>
      </details>
    </div>
  );
}
