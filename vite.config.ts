import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Where XAMPP serves the PHP API locally: http://localhost/<this project's folder name>, so it keeps
  // working if the folder is renamed. Override with TRANSENIGMA_API_TARGET (e.g. in .env.local).
  // Production serves the SPA and /api from the same domain.
  const apiTarget = env.TRANSENIGMA_API_TARGET || `http://localhost/${path.basename(__dirname)}`;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Only the frontend is watched: PHP writing email previews, logs, sessions or uploads must not reload the page.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              // Absolute folders (not "**/api/**", which would also stop watching the frontend's src/api).
              ignored: ['api', 'database', 'notes', 'tests', 'uploads', 'dist'].map((dir) => `${path.resolve(__dirname, dir).replace(/\\/g, '/')}/**`),
            },
      // Never serve backend, test or note files from the dev server. The /api proxy only matches the
      // literal prefix, so encoded paths (/%61pi/...) and /@fs/<abs path> would otherwise reach
      // api/config/config.local.php (secrets) and api/storage/mail (reset links). Vite's defaults are kept.
      fs: {
        deny: [
          '.env', '.env.*', '*.{crt,pem}', '**/.git/**',
          ...['api', 'database', 'notes', 'tests'].map((dir) => `${path.resolve(__dirname, dir).replace(/\\/g, '/')}/**`),
        ],
      },
      // Forward /api/* to the PHP backend so the browser sees one origin (cookies + CSRF work as in production).
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
