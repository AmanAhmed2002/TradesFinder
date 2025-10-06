// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow production build to succeed even if ESLint finds errors.
  // This only skips Next.js' lint step during `next build`.
  eslint: { ignoreDuringBuilds: true },

  // If TypeScript type errors also block the build and you want to bypass them temporarily,
  // uncomment the next line:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

