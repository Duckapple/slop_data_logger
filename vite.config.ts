import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiProxy = {
  target: 'http://localhost:8787',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiProxy,
      '/uploads': apiProxy,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'baseline-widely-available',
  },
});
