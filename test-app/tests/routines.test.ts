/**
 * Integration tests for the Routines Service.
 *
 * Validates routine listing.  The slcli routine_click.py uses the v1 routines
 * endpoint — these tests verify the TypeScript client produces compatible
 * requests with correctly typed responses.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import { getNiroutineV1Routines } from '../../src/generated/routines';
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

  it('lists routines', async () => {
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
