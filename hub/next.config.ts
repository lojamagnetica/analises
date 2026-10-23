import type { NextConfig } from "next";

// O Hub é um site estático publicado no GitHub Pages, em lojamagnetica.github.io/analises/portal/.
// Os dados vêm direto do Supabase pelo navegador; quem protege tudo são as regras do banco (RLS).
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/analises/portal",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
