import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/crm/nexaloom-crm/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // FORCE Vite to ignore these. If they are in the bundle, the app will be white.
      external: [
        'mysql2', 'mysql2/promise', 'events', 'process', 'net', 
        'tls', 'crypto', 'stream', 'util', 'zlib', 'url', 'timers', 'fs', 'path'
      ],
    },
  },
  define: {
    'process.env': {},
    'global': 'window',
  }
});