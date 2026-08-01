import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  build: {
    // Keeps peak memory low on constrained hosts and avoids shipping maps.
    sourcemap: false,
    chunkSizeWarningLimit: 900
  },
  server: {
    port: 5173,
    // During development the API lives on the Express server.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
});
