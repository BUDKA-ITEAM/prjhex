import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cp } from 'node:fs/promises';

const staticPaths = ['datanar', 'dataop', 'js', 'how-to-play.html', 'profile.html', 'styles.css'];

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'prjhex-data',
      async closeBundle() {
        for (const path of staticPaths) {
          await cp(new URL(path, import.meta.url), new URL(`dist/${path}`, import.meta.url), { recursive: true });
        }
      },
    },
  ],
  server: { port: 5173 },
});
