import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const clientPort = 3000;

function apiHeadTags(apiUrl: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' ${apiUrl}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'api-head-tags',
    transformIndexHtml: (_html, { server }) => [
      {
        tag: 'link',
        attrs: { rel: 'preconnect', href: apiUrl, crossorigin: 'use-credentials' },
        injectTo: 'head-prepend',
      },
      ...(server
        ? []
        : [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
              injectTo: 'head-prepend' as const,
            },
          ]),
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:3001';
  return {
    plugins: [
      react(),
      apiHeadTags(apiUrl),
      ...(process.env.ANALYZE
        ? [visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true, open: true })]
        : []),
    ],
    css: {
      preprocessorOptions: { scss: { silenceDeprecations: ['if-function'] } },
    },
    server: { port: clientPort, strictPort: true },
    preview: { port: clientPort, strictPort: true },
  };
});
