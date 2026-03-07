/**
 * Vitest global setup: load .env file (if present) before any test runs.
 *
 * Tests self-skip when SYSTEMLINK_API_URL/KEY are absent, so the suite still
 * passes cleanly in CI environments without credentials.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from the project root (one level up from test-app/)
loadDotenv({ path: resolve(__dirname, '..', '.env') });
