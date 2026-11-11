import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * DEV-ONLY config for the fixture harness (`npm run fixtures`).
 *
 * Differences from vite.config.ts:
 *  - serves fixtures.html for every route, so the real route tree is reachable
 *  - aliases @clerk/clerk-react to a local mock (the Clerk SDK is never loaded)
 *  - no /api proxy: API calls are answered in the browser by src/fixtures/mockApi.ts
 *  - refuses to build
 */
const fixtureHarness = (): Plugin => ({
  name: 'fricta-fixture-harness',
  apply: 'serve',
  config(_config, { command }) {
    if (command !== 'serve') throw new Error('vite.fixtures.config.ts is dev-server only and must not be built.');
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '/';
      // Placeholder for audit screenshots, which the app loads via <img>.
      if (url.startsWith('/api/workflows/screenshots/raw/')) {
        const step = url.match(/step-(\d+)/)?.[1] ?? '?';
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">` +
          `<rect width="1280" height="800" fill="#14141a"/><rect x="0" y="0" width="1280" height="64" fill="#1d1d26"/>` +
          `<rect x="80" y="130" width="520" height="40" rx="8" fill="#2a2a36"/><rect x="80" y="200" width="1120" height="16" rx="8" fill="#22222c"/>` +
          `<rect x="80" y="236" width="900" height="16" rx="8" fill="#22222c"/><rect x="80" y="320" width="340" height="220" rx="12" fill="#1d1d26"/>` +
          `<rect x="460" y="320" width="340" height="220" rx="12" fill="#1d1d26"/><rect x="840" y="320" width="340" height="220" rx="12" fill="#1d1d26"/>` +
          `<text x="640" y="680" fill="#f59e0b" font-family="monospace" font-size="28" text-anchor="middle">FIXTURE SCREENSHOT · STEP ${step}</text></svg>`,
        );
        return;
      }
      const isAsset = url.startsWith('/@') || url.startsWith('/src/') || url.startsWith('/node_modules/')
        || url.startsWith('/api/') || /\.[a-zA-Z0-9]+(\?.*)?$/.test(url);
      if (req.method === 'GET' && !isAsset) {
        const html = fs.readFileSync(path.resolve(__dirname, 'fixtures.html'), 'utf-8');
        server.transformIndexHtml(url, html).then(out => {
          res.setHeader('Content-Type', 'text/html');
          res.end(out);
        }, next);
        return;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), fixtureHarness()],
  appType: 'custom',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clerk/clerk-react': path.resolve(__dirname, './src/fixtures/mockClerk.tsx'),
    },
  },
  cacheDir: 'node_modules/.vite-fixtures',
  server: { port: 3100, strictPort: true, host: '127.0.0.1' },
});
