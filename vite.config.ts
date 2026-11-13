import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Central sert le build sous /software-lab/domos/ (npm run build après une modification).
// GitHub Pages le sert sous /domos/ : le workflow de déploiement passe DOMOS_BASE=/domos/.
export default defineConfig({
  base: process.env.DOMOS_BASE || "/software-lab/domos/",
  plugins: [react()],
  server: { port: 5182 },
});
