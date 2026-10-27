import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Content Security Policy for the production build. GitHub Pages can't send
 * security headers, so it goes in a <meta> tag. Scripts may only come from this
 * site; the only third party is Google Fonts. Inline style attributes are
 * allowed because React and the charts set them. Build-only, because the dev
 * server injects inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const securityMeta = (): Plugin => ({
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
    ),
})

// base: './' keeps asset paths relative, so the build works on any GitHub Pages repo name.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), securityMeta()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    sourcemap: false, // never publish source maps
    // three.js lives in its own lazy chunk (~245 kB gzipped), loaded after first paint
    chunkSizeWarningLimit: 1000,
  },
})
