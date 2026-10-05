import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hub Loja Magnética", template: "%s · Hub Loja Magnética" },
  description: "Portal da Mentoria e Hub da equipe Loja Magnética.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1C1412", width: "device-width", initialScale: 1 };

// Aplica tema e tamanho de letra salvos antes de pintar a tela (evita piscar).
const preferencias = `try{var r=document.documentElement,t=localStorage.getItem('lm_tema'),l=localStorage.getItem('lm_largo'),f=localStorage.getItem('lm_fs');if(t)r.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)r.dataset.theme='dark';if(l)r.dataset.largo=l;if(f)r.style.setProperty('--fs',f)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: preferencias }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
