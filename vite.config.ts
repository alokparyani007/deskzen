import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appVersion = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

export default defineConfig(({ isSsrBuild }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
      // index.html becomes the prerendered public pages; app.html is the plain shell for app routes.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // The SSR build (used only to prerender public pages) needs no service worker.
    !isSsrBuild &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'DeskZen',
          short_name: 'DeskZen',
          description: 'Sit better. Feel brighter.',
          theme_color: '#047857',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/app',
          lang: 'en-US',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
          // App routes open the plain shell, never the prerendered homepage.
          navigateFallback: 'app.html',
          // Let the server answer these directly (prerendered pages and crawler files).
          navigateFallbackDenylist: [/^\/(privacy|terms|login)\/?$/, /^\/(robots\.txt|sitemap\.xml)$/],
          // New deploys take over right away so nobody stays on an old cached build.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: true,
        },
      }),
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
