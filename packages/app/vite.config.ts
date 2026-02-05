import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: __dirname,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@arcana/vocabulary": resolve(__dirname, "../vocabulary/src"),
      "@arcana/viz": resolve(__dirname, "../viz/src"),
    },
  },
});
