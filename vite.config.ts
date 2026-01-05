import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for the app's usage of process.env.API_KEY during build
    'process.env': {
      API_KEY: process.env.API_KEY
    }
  }
});