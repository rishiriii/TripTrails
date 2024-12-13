import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',  // Set the public folder as the root
  build: {
    outDir: '../dist',  // Output to dist folder outside public
  },
  server: {
    proxy: {
      '/trips': 'http://localhost:3000',  // Proxy requests to your Express backend
    },
  },
});
