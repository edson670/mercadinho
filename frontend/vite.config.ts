import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Escuta em todas as interfaces de rede (não só localhost) — necessário
    // para abrir o app/catálogo a partir de outro dispositivo na mesma rede
    // (ex.: celular), usando o IP da máquina (ex.: http://192.168.0.5:5173).
    host: true,
    // O Vite recusa requisições cujo Host ele não conhece. Sem isto, abrir o
    // sistema por um túnel (Cloudflare) devolve "Blocked request" em vez da
    // aplicação. Só vale para o servidor de desenvolvimento.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
