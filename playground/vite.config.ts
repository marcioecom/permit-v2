import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // resolve: {
  //   alias: {
  //     "@": resolve(__dirname, "../sdk/src"),
  //   },
  // },
  server: {
    port: 3000,
    open: true,
    watch: {
      // Observa mudanças no SDK (symlink em node_modules)
      ignored: ["!**/node_modules/@permit/react/**"],
    },
  },
  optimizeDeps: {
    // CRÍTICO: Exclui SDK do pre-bundling para habilitar HMR
    exclude: ["@permit/react"],
  },
  build: {
    sourcemap: true,
  },
});
