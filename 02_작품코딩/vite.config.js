import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // These direct ESM imports already contain only the icons we use.
  optimizeDeps: { exclude: ["lucide-react"] },
});
