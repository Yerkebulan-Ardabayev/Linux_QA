import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// Режим offline собирает сайт для открытия из папки по file://, без сервера:
// относительные пути и весь код в одном файле (скрипт inline-offline.mjs).
export default defineConfig(({ mode }) => ({
  base: mode === "offline" ? "./" : process.env.NODE_ENV === "production" ? "/Linux_QA/" : "/",
  build:
    mode === "offline"
      ? { outDir: "dist-offline", assetsInlineLimit: 100_000_000, rollupOptions: { output: { inlineDynamicImports: true } } }
      : {},
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
