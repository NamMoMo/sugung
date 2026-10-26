import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: { outDir: 'dist', emptyOutDir: false, minify: false,
    lib: { entry: 'server/cloudflare-worker.js', formats: ['es'], fileName: () => '_worker.js' },
  },
});
