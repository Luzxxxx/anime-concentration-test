import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '二次元浓度研究所 · 樱花街机学院',
        short_name: '浓度通行证',
        description: '226 道 ACGN 知识题、三种挑战模式与专属次元通行证',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFF8FB',
        theme_color: '#315EFB',
        lang: 'zh-CN',
        icons: [
          {
            src: './assets/images/og/cover.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{html,js,css,json,png,jpg}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
