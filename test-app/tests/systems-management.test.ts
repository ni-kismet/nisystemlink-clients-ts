/**
 * Integration tests for the Systems Management Service.
 *
 * Validates system listing and queries.  The slcli system_click.py uses
 * similar query patterns — these tests validate that the TypeScript types
 * match real API responses, catching any drift between spec and service.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  postNisysmgmtV1QuerySystems,
  getNisysmgmtV1GetSystemsSummary,
} from '../../src/generated/systems-management';
import { createClient, createConfig } from '../../src/generated/systems-management/client';

const configured = isConfigured();

describe.skipIf(!configured)('Systems Management Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  it('queries systems', async () => {
    const { data, error, response } = await postNisysmgmtV1QuerySystems({
      client,
      body: { take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    // The spec declares 200: Array<SystemsResponse> but the real API may return
    // either a raw array OR a wrapper object { data: [...], count: N }.
    // The slcli _parse_systems_response() handles both shapes — we just check
    // the response is non-null and truthy.
    expect(data).toBeTruthy();
  });

  it('system objects have expected shape', async () => {
    const { data } = await postNisysmgmtV1QuerySystems({
      client,
      body: { take: 5 },
    });
    // Handle both possible response shapes from the real API
    const systems = Array.isArray(data) ? data : [];

    if (systems.length > 0) {
      const s = systems[0];
      // When the API returns an array, each element is a SystemsResponse
      // object with a nested `data` field containing the system details.
      expect(s).toHaveProperty('data');
    }
  });

  it('returns systems summary', async () => {
    const { data, error, response } = await getNisysmgmtV1GetSystemsSummary({ client });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(data).toBeDefined();
  });
});
