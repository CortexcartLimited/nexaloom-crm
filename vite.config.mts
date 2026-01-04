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
    content: [
      "./index.html",
      "./*.{js,ts,jsx,tsx}",
    ],
    build: {
    },

    define: {
      'process.env': {},
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': 'window',
    },
    // Fixed resolve section
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'mysql2/promise': path.resolve(__dirname, 'empty-module.js'),
        'mysql2': path.resolve(__dirname, 'empty-module.js'),
      },
    },
  };
});