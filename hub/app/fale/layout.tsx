import type { Metadata } from "next";
import { BASE } from "@/lib/config";

// O app do celular só do Fale com a Camilla (para as lojas): tem o próprio ícone e abre direto na conversa, em tela cheia.
export const metadata: Metadata = {
  title: "Fale com a Camilla",
  manifest: `${BASE}/manifest-fale.webmanifest`,
  icons: {
    icon: [{ url: `${BASE}/icon-conversas-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${BASE}/apple-touch-icon-conversas.png`, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { title: "Camilla", capable: true, statusBarStyle: "black" },
  robots: { index: false, follow: false },
};

export default function LayoutFale({ children }: { children: React.ReactNode }) {
  return children;
}
