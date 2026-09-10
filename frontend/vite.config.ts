import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server: /api and /uploads are proxied to the backend container.
// In Docker the frontend is served by nginx, which does the same routing.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: process.env.VITE_API_PROXY ?? 'http://localhost:3000', changeOrigin: true },
    },
  },
});
