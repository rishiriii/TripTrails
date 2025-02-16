import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',  // Set the public folder as the root
  build: {
    outDir: '../dist',  // Output to dist folder outside public
  },
  server: {
    host: '0.0.0.0',  // Allow external access
    proxy: {
      '/trips': 'http://localhost:3000',  // Proxy trips requests to your Express backend
      '/users': 'http://localhost:3000',  // Add this line to proxy users requests
    },
  },
});