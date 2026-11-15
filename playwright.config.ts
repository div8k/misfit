import { defineConfig, devices } from '@playwright/test';

// E2E_TARGET=build runs the same tests against the production build
// (with its Content Security Policy) instead of the dev server.
const build = process.env.E2E_TARGET === 'build';
const PORT = build ? 5198 : 5199;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  webServer: {
    command: build ? `npm run build && npm run preview -- --port ${PORT} --strictPort` : `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Reuse a dev server that is already running; always rebuild for the build target.
    reuseExistingServer: !build,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@touch/ },
    { name: 'phone-touch', use: { ...devices['Pixel 7'] }, grep: /@touch/ },
  ],
});
