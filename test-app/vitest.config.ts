import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

// Resolve paths relative to THIS config file (test-app/), not the project root
const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: resolve('.'),
  test: {
    // Load .env before tests run so SYSTEMLINK_API_URL/KEY are available.
    // Tests self-skip when these vars are absent so the suite always passes
    // in CI without credentials.
    setupFiles: [resolve('./setup.ts')],
    // Each test file gets its own worker so module-level client.setConfig()
    // calls don't bleed across services.
    pool: 'forks',
    reporters: ['verbose'],
    testTimeout: 30_000,
  },
});
