import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
        // The Express API (server/index.js) runs on port 3001; /api/events is a live Server-Sent Events stream.
        proxy: {
            '/api': { target: `http://127.0.0.1:${process.env.PORT || 3001}`, changeOrigin: true },
        },
    },
});
