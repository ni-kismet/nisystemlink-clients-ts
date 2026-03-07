/**
 * Integration tests for the Alarm Service.
 *
 * Validates alarm instance querying.  The slcli project does not yet expose
 * alarm commands directly, but the alarm service is a key SystemLink API used
 * in monitoring dashboards.  These tests confirm the generated SDK matches
 * the real API contract.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import { postNialarmV1QueryInstances, getNialarm } from '../../src/generated/alarm';
import { createClient, createConfig } from '../../src/generated/alarm/client';

const configured = isConfigured();

describe.skipIf(!configured)('Alarm Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  it('service root is reachable', async () => {
    const { response } = await getNialarm({ client });
    // Root endpoint returns service metadata; accept 200 or 204
    expect(response.status).toBeLessThan(400);
  });

  it('queries alarm instances', async () => {
    const { data, error, response } = await postNialarmV1QueryInstances({
      client,
      body: { take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    // The spec documents filterMatches as the alarm results array
    expect(data).toHaveProperty('filterMatches');
    expect(Array.isArray(data!.filterMatches)).toBe(true);
  });

  it('alarm instance objects have expected shape', async () => {
    const { data } = await postNialarmV1QueryInstances({
      client,
      body: { take: 5 },
    });
    const alarms = data?.filterMatches ?? [];

    if (alarms.length > 0) {
      const a = alarms[0];
      // HttpAlarm fields from the OpenAPI spec
      expect(a).toHaveProperty('alarmId');
    }
  });
});
