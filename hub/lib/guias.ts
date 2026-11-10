// Guias em vídeo para mandar às lojas (primeiro acesso, instalar o app...). Os arquivos ficam em public/video.
// Para um guia novo: coloque o .mp4 em public/video e acrescente aqui.
import { BASE } from "@/lib/config";

export type Guia = { id: string; titulo: string; para: string; arquivo: string; duracao: string };

export const GUIAS: Guia[] = [
  { id: "primeiro-acesso-iphone", titulo: "Primeiro acesso e app no celular · iPhone", para: "Criar a senha, colocar a foto ou a logo e instalar o Hub como aplicativo no iPhone (Safari).", arquivo: "primeiro-acesso-iphone.mp4", duracao: "1:14" },
  { id: "primeiro-acesso-android", titulo: "Primeiro acesso e app no celular · Android", para: "Criar a senha, colocar a foto ou a logo e instalar o Hub como aplicativo no Android (Chrome).", arquivo: "primeiro-acesso-android.mp4", duracao: "1:17" },
];

/** Endereço completo do vídeo (para mandar no WhatsApp). */
export const linkGuia = (g: Guia) =>
  `${typeof window === "undefined" ? "https://lojamagnetica.github.io" : window.location.origin}${BASE}/video/${g.arquivo}`;
export const guia = (id: string) => GUIAS.find((g) => g.id === id)!;

/** Aulas interativas (página própria, em public/aula): passo a passo animado para a loja e para a equipe. */
export type Aula = { id: string; titulo: string; para: string; arquivo: string; duracao: string };
export const AULAS: Aula[] = [
  { id: "fechamento-caixa", titulo: "Como fechar o caixa no Hub", para: "Quem tem sistema sobe até 3 arquivos do fechamento; quem não tem preenche à mão todos os dias.", arquivo: "fechamento-caixa.html", duracao: "3 min" },
  { id: "lista-da-vez", titulo: "Como usar a Lista da vez no celular", para: "Para a equipe: abrir o link pessoal, entrar na vez, marcar vendeu ou não vendeu, a missão do dia e os seus números.", arquivo: "lista-da-vez.html", duracao: "2 min" },
];
export const aulaPorId = (id: string) => AULAS.find((a) => a.id === id)!;
export const linkAula = (a: Aula) =>
  `${typeof window === "undefined" ? "https://lojamagnetica.github.io" : window.location.origin}${BASE}/aula/${a.arquivo}`;
