import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildId = new Date().toISOString()

// Written next to the bundle so a running tab can tell that a newer build has
// been deployed. GitHub Pages caches index.html, and a tab left open never
// revalidates it at all, so without this an old bundle renders indefinitely.
const emitBuildId: Plugin = {
  name: 'emit-build-id',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'build.json',
      source: JSON.stringify({ id: buildId }),
    })
  },
}

// Relative base keeps the build working on any GitHub Pages path
// (user site, project site, or a custom domain) without reconfiguration.
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), tailwindcss(), emitBuildId],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    host: '127.0.0.1',
    port: 43187,
  },
})
