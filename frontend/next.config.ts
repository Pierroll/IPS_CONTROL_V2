import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No romper por ESLint en build
  eslint: { ignoreDuringBuilds: true },

  // (Opcional) No romper por errores de TypeScript en build
  // Quita este flag cuando limpies los tipos.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
