// Baut die Oberfläche nach ..\app (index.html, ui.js, ui.css)
// Bauen: npm install  &&  npm run build
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: {
    outDir: '../app',
    emptyOutDir: false,
    assetsDir: '.',
    modulePreload: false,
    target: 'chrome130',
    rollupOptions: {
      output: {
        entryFileNames: 'ui.js',
        chunkFileNames: 'ui-[name].js',
        assetFileNames: 'ui[extname]',
      },
    },
  },
});
