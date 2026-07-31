import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const serverConfig = {
  host: '0.0.0.0',
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
    },
    '/ohif/viewer': {
      target: 'http://localhost:5173',
      rewrite: () => '/ohif/index.html',
    }
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: serverConfig,
  preview: serverConfig,
  build: {
    outDir: '../backend/public',
    emptyOutDir: false, // Don't empty backend/public since it has index.php and other files!
  }
})
