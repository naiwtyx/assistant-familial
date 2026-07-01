import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dossier parent contient un autre projet (avec son propre lockfile).
  // On épingle la racine sur CE projet pour éviter toute ambiguïté de tracing.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
