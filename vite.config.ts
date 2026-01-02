import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables so we can use GEMINI_API_KEY
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/crm/nexaloom-crm/',
    plugins: [react(), tailwindcss()],
    
    server: {
      port: 3006,
      host: '0.0.0.0',
    },

    build: {
      rollupOptions: {
        // This stops the "white screen" by preventing Node.js code from entering the browser
        external: [
          'mysql2', 'mysql2/promise', 'events', 'process', 'net', 
          'tls', 'crypto', 'stream', 'util', 'zlib', 'url', 'timers', 'fs', 'path'
        ],
      },
    },

    define: {
      'process.env': {},
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': 'window',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // These lines "kill" the backend imports if they leak into the frontend
        'mysql2/promise': path.resolve(__dirname, 'empty-module.js'),
        'mysql2': path.resolve(__dirname, 'empty-module.js'),
      },
    },
  };
});