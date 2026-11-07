"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Titulo } from "@/components/Titulo";
import { Carregando, useDados, useEquipe } from "@/lib/hub";
import { hoje } from "@/lib/formato";
import { buscarComercial, registrarVenda } from "@/lib/comercial";
import { buscarLead, fecharLead } from "@/lib/leads";
import { buscarJornada } from "@/lib/jornada";

// Nova venda: o que o Comercial passa para a CS. Cria o portal (sem mandar o acesso) e a passagem de bastão.
// Vindo de um lead fechado (?lead=…), já vem com o que o lead tinha e, ao registrar, o lead guarda o portal criado.
// Com ?portal=…, a cliente já está no Hub (entrou antes da Central): o portal é aproveitado e só a passagem é criada.
function NovaVenda() {
  const { nome } = useEquipe();
  const router = useRouter();
  const busca = useSearchParams();
  const leadId = busca.get("lead");
  const portalId = busca.get("portal");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { dados } = useDados(async () => ({
    ...(await buscarComercial()),
    lead: leadId ? await buscarLead(leadId) : null,
    cliente: portalId ? (await buscarJornada(portalId))[0] ?? null : null,
  }), [leadId, portalId]);
  if (!dados) return <Carregando />;
  const planos = dados.planos.filter((p) => p.vendendo || p.id === dados.cliente?.plano);
  const cli = dados.cliente;
  // O que já se sabe da cliente: do lead ou do portal que já existe.
  const lead = dados.lead ?? (cli ? { loja: cli.loja, instagram: "", nome: cli.responsavel ?? "", whatsapp: cli.whatsapp ?? "", valor_estimado: null, responsavel: null, origem: "", obs: "" } : null);

  return (
    <>
      <Titulo
        voltar={cli ? { href: `/equipe/central/cliente?id=${cli.id}`, rotulo: cli.loja } : { href: "/equipe/comercial", rotulo: "Comercial" }}
        titulo={cli ? "Passagem da cliente" : "Nova venda"}
        sub={cli
          ? "Esta cliente já está no Hub. Preencha os dados da venda e do contrato: o portal dela continua como está e a Claudia recebe a passagem na Central do Cliente."
          : "Pagamento confirmado? Preencha aqui. O Hub cria o portal da cliente e a Claudia recebe a passagem na Central do Cliente. O acesso da cliente só vai no onboarding."}
      />
      <form
        className="card"
        style={{ maxWidth: 820 }}
        action={async (f) => {
          setSalvando(true); setErro("");
          try {
            const id = await registrarVenda(f, nome, cli?.id);
            if (dados.lead) await fecharLead(dados.lead.id, id);
            router.push(cli ? `/equipe/central/cliente?id=${id}` : `/equipe/comercial?nova=${id}`);
          } catch (e) { setErro((e as Error).message); setSalvando(false); }
        }}
      >
        <div className="secao" style={{ marginTop: 0 }}>A loja</div>
        <div className="grade g2" style={{ gap: 12 }}>
          <div><label className="rotulo">Nome da loja</label><input name="loja" required defaultValue={lead?.loja ?? ""} /></div>
          <div><label className="rotulo">Instagram</label><input name="instagram" placeholder="@loja" defaultValue={lead?.instagram ?? ""} /></div>
          <div><label className="rotulo">Responsável (como chamamos)</label><input name="responsavel" defaultValue={lead?.nome ?? ""} /></div>
          <div><label className="rotulo">WhatsApp</label><input name="whatsapp" defaultValue={lead?.whatsapp ?? ""} /></div>
          <div><label className="rotulo">Aniversário da responsável</label><input type="date" name="aniversario" /></div>
          <div><label className="rotulo">E-mail de acesso ao Hub</label><input name="email" type="email" defaultValue={cli?.email ?? ""} /></div>
          <div><label className="rotulo">Lojas mentoradas (se for mais de uma)</label><input name="lojas_mentoradas" placeholder="Ex.: Loja Feminina e Loja Masculina" /></div>
        </div>

        <div className="secao">A venda</div>
        <div className="grade g2" style={{ gap: 12 }}>
          <div>
            <label className="rotulo">Plano</label>
            <select name="plano" required defaultValue={cli?.plano ?? ""}>
              <option value="" disabled>Escolha</option>
              {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.meses ? ` · ${p.meses} meses` : ""}</option>)}
            </select>
          </div>
          <div><label className="rotulo">Valor total (R$)</label><input name="valor" inputMode="decimal" placeholder="Ex.: 12000" defaultValue={lead?.valor_estimado ?? ""} /></div>
          <div><label className="rotulo">Data do pagamento confirmado</label><input name="pagamento_em" type="date" defaultValue={hoje()} required /></div>
          <div><label className="rotulo">Forma de pagamento</label><input name="forma_pagamento" placeholder="Ex.: cartão de crédito em 12x · PIX à vista" /></div>
          <div><label className="rotulo">Vendido por</label><input name="vendido_por" defaultValue={lead?.responsavel ?? nome} /></div>
          <div><label className="rotulo">Como chegou</label><input name="origem" placeholder="Ex.: Instagram, indicação da Fulana, evento" defaultValue={lead?.origem ?? ""} /></div>
        </div>
        <label className="rotulo">Na call: &quot;Se a mentoria resolver uma coisa só em 90 dias, qual é?&quot;</label>
        <textarea name="resultado_90" rows={2} required />
        <label className="marcar" style={{ marginTop: 10 }}><input type="checkbox" name="alinhado" required /> Alinhei o que a mentoria faz e não faz (não atuamos no financeiro)</label>
        <label className="marcar"><input type="checkbox" name="bonus" /> Bônus comercial concedido (treinamento de vendas)</label>
        <label className="marcar"><input type="checkbox" name="garantia" /> Com a garantia de risco zero</label>
        <label className="rotulo">O que a CS precisa saber (combinados, perfil, cuidados)</label>
        <textarea name="observacoes" rows={3} defaultValue={lead?.obs ?? ""} />

        <div className="secao">Dados para o contrato</div>
        <p className="ajuda" style={{ marginTop: -6 }}>Vão direto para o contrato que a Claudia gera. Só a equipe vê.</p>
        <div className="grade g2" style={{ gap: 12 }}>
          <div><label className="rotulo">Razão social ou nome completo</label><input name="contratante_nome" /></div>
          <div><label className="rotulo">CNPJ ou CPF</label><input name="contratante_doc" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="rotulo">Endereço completo (rua, número, bairro, cidade/UF, CEP)</label><input name="contratante_endereco" /></div>
          <div><label className="rotulo">Representante legal</label><input name="representante" /></div>
          <div><label className="rotulo">Cargo do representante</label><input name="representante_cargo" placeholder="Ex.: sócia administradora" /></div>
          <div><label className="rotulo">CPF do representante</label><input name="representante_cpf" /></div>
          <div><label className="rotulo">E-mail para a assinatura</label><input name="email_contrato" type="email" /></div>
        </div>

        {erro && <div className="aviso mt">{erro}</div>}
        <div className="linha mt"><button className="btn p" type="submit" disabled={salvando}>{salvando ? "Registrando…" : cli ? "Registrar a passagem para a CS" : "Registrar venda e passar para a CS"}</button></div>
      </form>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Carregando />}><NovaVenda /></Suspense>;
}
