import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['d3', 'scrollama']
  }
}) 