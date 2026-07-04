import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  // Tests de logique pure : on n'a pas besoin du pipeline CSS/PostCSS (Tailwind v4).
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
