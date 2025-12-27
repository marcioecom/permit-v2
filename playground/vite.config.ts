import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    // CRÍTICO: Exclui SDK do pre-bundling para habilitar HMR
    exclude: ["@permit/react"],
  },
  build: {
    sourcemap: true,
  },
});
