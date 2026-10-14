import { defineConfig } from 'vite';

// base './' zodat de build overal te hosten is (GitHub Pages, Netlify, submap, ...)
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 900 } });
