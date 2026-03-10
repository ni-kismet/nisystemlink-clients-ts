/**
 * Integration tests for the Routines Service.
 *
 * NOTE: routines-v2 is the preferred API for new code (general-purpose
 * event-driven routines). routines-v1 only supports notebook-backed routines.
 * This file tests v1 to confirm backward compatibility; see routines-v2.test.ts
 * for the recommended patterns.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import { getNiroutineV1Routines, getNiroutine } from '../../src/generated/routines';
import { createClient, createConfig } from '../../src/generated/routines/client';

const configured = isConfigured();

describe.skipIf(!configured)('Routines Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  it('root endpoint is reachable', async () => {
    const { response } = await getNiroutine({ client });
    expect(response.status).toBeLessThan(400);
  });

  it('lists routines (v1 — notebook routines only; prefer v2 for new code)', async () => {
    // The routines list endpoint does not support skip/take — returns all routines
    const { data, error, response } = await getNiroutineV1Routines({ client });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data!.routines)).toBe(true);
  });

  it('routine objects have expected shape', async () => {
    const { data } = await getNiroutineV1Routines({ client });
    const routines = data?.routines ?? [];

    if (routines.length > 0) {
      const r = routines[0];
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
    }
  });
});
