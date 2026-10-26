import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { stationPlugin } from './server/station-plugin.js';

export default defineConfig({
  plugins: [react(), stationPlugin()],
  // These direct ESM imports already contain only the icons we use.
  optimizeDeps: { exclude: ["lucide-react"] },
});
