import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// The dev server may be reached through a proxy host (e.g. hosted previews).
// Wildcarding this to `true` accepts any Host header, which combined with an
// unauthenticated API exposes the server to DNS rebinding. Accept an explicit
// allowlist instead, extendable through ALLOWED_DEV_HOSTS.
const allowedDevHosts = [
  'localhost',
  '127.0.0.1',
  ...(process.env.ALLOWED_DEV_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: allowedDevHosts,
    },
  };
});
