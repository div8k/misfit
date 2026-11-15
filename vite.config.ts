import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Content Security Policy for the built site: only this site's own scripts, styles,
// fonts and images may load, and the page may not post forms or load plugins.
// (Only applied to builds: the dev server needs inline scripts for hot reload.)
// frame-ancestors, HSTS and X-Content-Type-Options can only be set as HTTP
// headers, so they belong in the hosting configuration.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const csp = (): Plugin => ({
  name: 'misfit-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
    ),
})

export default defineConfig({
  plugins: [react(), csp()],
  base: './',
  // PUBLIC_SITE_URL is the canonical URL used in share links.
  envPrefix: ['VITE_', 'PUBLIC_'],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
