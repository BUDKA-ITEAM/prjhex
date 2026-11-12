import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cp } from 'node:fs/promises';
export default defineConfig({base:process.env.VITE_BASE_PATH || '/',plugins:[react(),tailwindcss(),{name:'prjhex-data',async closeBundle(){for (const path of ['data','datanar','dataop','js','how-to-play.html','profile.html','styles.css']) await cp(path,`dist/${path}`,{recursive:true});}}],server:{port:5173}});
