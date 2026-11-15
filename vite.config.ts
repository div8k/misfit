import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  base: './',
  // PUBLIC_SITE_URL is the canonical URL used in share links.
  envPrefix: ['VITE_', 'PUBLIC_'],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
