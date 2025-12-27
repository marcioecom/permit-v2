import { defineConfig } from "@twind/core";
import presetTailwind from "@twind/preset-tailwind";

export default defineConfig({
  presets: [presetTailwind()],
  // Prefixo para evitar conflitos com Tailwind do projeto host (opcional)
  // hash: true,
});
