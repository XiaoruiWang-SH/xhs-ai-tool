import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import zip from 'vite-plugin-zip-pack';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: 'release.zip' }),
    tailwindcss(),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
