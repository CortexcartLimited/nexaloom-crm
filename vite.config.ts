import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // Assuming you are using the v4 plugin

export default defineConfig(({ mode }) => {
    // 1. Load your environment variables first
    const env = loadEnv(mode, '.', '');

    // 2. Return the configuration object
    return {
      // THE FIX: base must be INSIDE this return object
      base: '/crm/nexaloom-crm/', 
      
      plugins: [
        react(),
        tailwindcss()
      ],
      build: {
        rollupOptions: {
          // 1. Manually ignore the backend libraries causing the white screen
          external: [
            'mysql2', 
            'mysql2/promise', 
            'events', 
            'process', 
            'net', 
            'tls', 
            'crypto', 
            'stream', 
            'util', 
            'zlib',
            'url',
            'timers'
          ],
        },
      },
      server: {
        port: 3006,
        host: '0.0.0.0',
      },

      define: {
        // This helps libraries that expect process.env not to crash
        'process.env': {}, 
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});