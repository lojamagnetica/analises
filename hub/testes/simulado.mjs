// Supabase simulado para os testes de tela (Playwright). Tudo fica em memória: nenhum dado real.
// Uso: const banco = await simular(page, { tabelas: {...}, rpc: {...}, usuario: {...} })
import { randomUUID } from "node:crypto";

const URL_SUPABASE = "https://gnbjberxugnqzbxvzinh.supabase.co";
const CHAVE_SESSAO = "sb-gnbjberxugnqzbxvzinh-auth-token";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

function comparar(op, valorLinha, valor) {
  const v = valorLinha == null ? null : String(valorLinha);
  switch (op) {
    case "eq": return v === valor;
    case "neq": return v !== valor;
    case "gt": return v != null && (isNaN(+v) ? v > valor : +v > +valor);
    case "gte": return v != null && (isNaN(+v) ? v >= valor : +v >= +valor);
    case "lt": return v != null && (isNaN(+v) ? v < valor : +v < +valor);
    case "lte": return v != null && (isNaN(+v) ? v <= valor : +v <= +valor);
    case "is": return valor === "null" ? v == null : v === valor;
    case "in": return valor.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")).includes(v);
    case "like": case "ilike": return v != null && new RegExp("^" + valor.replace(/[%*]/g, ".*") + "$", op === "ilike" ? "i" : "").test(v);
    case "cs": return Array.isArray(valorLinha) && valor.replace(/^\{|\}$/g, "").split(",").every((x) => valorLinha.includes(x));
    default: return true;
  }
}

const RESERVADOS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function filtrar(linhas, params) {
  let r = linhas;
  for (const [col, expr] of params) {
    if (RESERVADOS.has(col)) continue;
    if (col === "or") continue; // não usado nas telas testadas
    const neg = expr.startsWith("not.");
    const e = neg ? expr.slice(4) : expr;
    const i = e.indexOf(".");
    const op = e.slice(0, i), valor = decodeURIComponent(e.slice(i + 1));
    r = r.filter((l) => comparar(op, l[col], valor) !== neg);
  }
  const ordem = params.get("order");
  if (ordem) {
    const chaves = ordem.split(",").map((o) => { const [c, d] = o.split("."); return [c, d === "desc" ? -1 : 1]; });
    r = [...r].sort((a, b) => {
      for (const [c, d] of chaves) {
        if (a[c] === b[c]) continue;
        if (a[c] == null) return 1;
        if (b[c] == null) return -1;
        return (a[c] > b[c] ? 1 : -1) * d;
      }
      return 0;
    });
  }
  const off = Number(params.get("offset") ?? 0), lim = params.get("limit");
  return lim ? r.slice(off, off + Number(lim)) : r.slice(off);
}

export async function simular(page, { tabelas = {}, rpc = {}, usuario = { id: "u-loja", email: "loja@teste.com" }, local = {} } = {}) {
  const banco = { tabelas, chamadas: [] };
  for (const t of Object.keys(tabelas)) tabelas[t] = tabelas[t] ?? [];

  const sessao = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: usuario.id, email: usuario.email, role: "authenticated", exp: 4102444800 })}.x`,
    refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: 4102444800,
    user: { id: usuario.id, email: usuario.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} },
  };
  await page.addInitScript(([chave, valor, extra]) => {
    localStorage.setItem(chave, valor);
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, [CHAVE_SESSAO, JSON.stringify(sessao), local]);

  await page.route(`${URL_SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const metodo = req.method();
    const cab = req.headers();
    const json = (corpo, status = 200, extra = {}) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", ...extra }, body: corpo === undefined ? "" : JSON.stringify(corpo) });
    if (metodo === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });

    if (url.pathname.startsWith("/auth/")) return json({});
    if (url.pathname.startsWith("/storage/") || url.pathname.startsWith("/functions/")) return json({});

    const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([\w-]+)/);
    if (!m) return json({});
    const [, ehRpc, nome] = m;
    const corpo = req.postData() ? JSON.parse(req.postData()) : undefined;

    if (ehRpc) {
      banco.chamadas.push({ rpc: nome, args: corpo });
      const f = rpc[nome];
      if (!f) return json(null);
      try { return json(await f(corpo ?? {}, banco)); } catch (e) { return json({ message: e.message, code: "P0001" }, 400); }
    }

    const tabela = (banco.tabelas[nome] ??= []);
    const params = url.searchParams;
    const objeto = (cab["accept"] ?? "").includes("vnd.pgrst.object");
    const prefer = cab["prefer"] ?? "";
    const responder = (linhas) => {
      if (objeto) return linhas.length === 1 ? json(linhas[0]) : json({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, 406);
      const extra = prefer.includes("count=") ? { "content-range": `0-${Math.max(linhas.length - 1, 0)}/${linhas.length}` } : {};
      return json(metodo === "HEAD" ? undefined : linhas, 200, extra);
    };

    if (metodo === "GET" || metodo === "HEAD") return responder(filtrar(tabela, params));

    banco.chamadas.push({ tabela: nome, metodo, corpo, filtros: url.search });
    if (metodo === "POST") {
      const novos = (Array.isArray(corpo) ? corpo : [corpo]).map((l) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...l }));
      const conflito = params.get("on_conflict")?.split(",") ?? (prefer.includes("merge-duplicates") ? [["id", "chave", "portal_id"].find((c) => novos[0][c] !== undefined && c in (tabela[0] ?? novos[0]))] : null);
      const feitos = novos.map((n) => {
        const existente = conflito ? tabela.find((l) => conflito.every((c) => l[c] === n[c])) : null;
        if (existente) { Object.assign(existente, n); return existente; }
        tabela.push(n);
        return n;
      });
      return prefer.includes("return=representation") ? responder(feitos) : json(undefined, 201);
    }
    const alvo = filtrar(tabela, params);
    if (metodo === "PATCH") {
      alvo.forEach((l) => Object.assign(l, corpo));
      return prefer.includes("return=representation") ? responder(alvo) : json(undefined, 204);
    }
    if (metodo === "DELETE") {
      banco.tabelas[nome] = tabela.filter((l) => !alvo.includes(l));
      return prefer.includes("return=representation") ? responder(alvo) : json(undefined, 204);
    }
    return json({});
  });
  return banco;
}

/** Uma loja de teste, já com o vídeo visto, Dados da loja feitos e o Diagnóstico liberado. */
export function lojaBase({ diagnostico = true, video = true, tipo = "Mentoria" } = {}) {
  const portal = "p-teste";
  const etapas = [1, 9, 10, 5, 3, 4, 8, 7];
  return {
    portal,
    tabelas: {
      perfis: [{ id: "u-loja", nome: "Ana Teste", email: "loja@teste.com", papel: "loja", portal_id: portal, foto: null, estudio: false }],
      portais: [{ id: portal, loja: "Loja Teste", responsavel: "Ana Teste", email: "loja@teste.com", whatsapp: "81999990000", tipo, inicio: "2026-08-01", passo_atual: 2, meet_url: null, apelidos: [], ativo: true, lojas: [] }],
      personalizacao: etapas.map((n) => ({ portal_id: portal, etapa: n, respostas: n === 1 ? { segmento: "Multimarca feminina" } : {}, concluida: true })),
      portal_entrada: [{ portal_id: portal, video_visto_em: video ? "2026-09-01T12:00:00Z" : null, livre: false, dados_enviados_em: "2026-09-10T12:00:00Z" }],
      loja_equipe: [{ id: "e1", portal_id: portal, ativo: true }],
      loja_diagnostico: diagnostico ? [{ portal_id: portal, status: "liberada", liberada_em: "2026-09-15T12:00:00Z" }] : [],
    },
  };
}

/** Método de conteúdo mínimo (o real fica só no banco). */
export function metodoConteudo() {
  const roteiro = { id: "r1", nome: "Modelo teste", formato: "Reels", objetivo: "Atrair", quando: "Quando quiser.", linhas: [
    { rotulo: "Gancho", fala: "Olha essa [peça]", nota: "" }, { rotulo: "Cena", fala: "Mostre a [peça] no corpo", nota: "" }, { rotulo: "CTA", fala: "Chama no direct", nota: "" },
  ] };
  return {
    algoritmo: [], vender_sem_catalogo: { titulo: "", texto: "" }, checklist: ["Gancho nos 3 primeiros segundos"], pare: [], comece: [], estrategia: [],
    objetivos: { Atrair: { sinal: "", texto: "Alcance" }, Conectar: { sinal: "", texto: "Confiança" }, Vender: { sinal: "", texto: "Venda" } },
    formatos: ["Reels", "Carrossel", "Stories"], roteiros: [roteiro], ganchos: [], ideias: [], ctas: [], legenda: { linhas: ["[gancho com outras palavras]", "[CTA]"], regras: [] },
    workflow: [], ferramentas: [], cronograma: [], bio: { limite: 150, linhas: [], regras: [] }, destaques: [], correcoes: [],
    semana: [{ dia: 1, papel: "Série", roteiro: "r1", objetivo: "Atrair", formato: "Reels" }], codigos: [], fundamentos: [], complementar: [], rotina: [], caminho: "",
    textos: { trancado: "Trancado.", semana_sub: "Seus posts.", hora_padrao: "19:00", hora_nota: "", data_antes: "", roteiro_sub: "", resultados_sub: "" },
  };
}

/** Conteúdo liberado para a loja de teste (análise do perfil liberada). */
export function conteudoLiberado(portal) {
  return {
    metodo: [{ chave: "conteudo", dados: metodoConteudo() }],
    loja_analise_perfil: [{ portal_id: portal, status: "liberada", dados: {}, liberada_em: "2026-09-20T12:00:00Z", updated_at: "2026-09-20T12:00:00Z" }],
    loja_conteudo: [{ portal_id: portal, feitas: [], ajustes: {}, desafio: {} }],
  };
}
