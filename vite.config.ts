import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      buffer: 'buffer'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'rxdb-vendor': ['rxdb', 'rxjs'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-slot', 'lucide-react', 'date-fns']
        }
      }
    }
  }
});
