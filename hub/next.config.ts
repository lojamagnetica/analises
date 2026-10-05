import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O protótipo estático fica fora do app.
  outputFileTracingExcludes: { "*": ["prototipo/**"] },
};

export default nextConfig;
