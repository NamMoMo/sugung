import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { queuePlugin } from './server/queue-plugin.js';
export default defineConfig({ plugins: [react(), queuePlugin()],server:{watch:{ignored:['**/.sites/**','**/.backups/**']}} });
