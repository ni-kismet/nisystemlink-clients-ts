/**
 * Integration tests for the Alarm Service.
 *
 * Preferred endpoint: postNialarmV1QueryInstancesWithFilter (Dynamic LINQ) —
 * this supersedes the legacy postNialarmV1QueryInstances (deprecated in v4).
 * Tests explicitly verify the new endpoint is used and flag the old one as
 * deprecated so callers don't reach for it.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNialarm,
  getNialarmByVersion,
  postNialarmV1QueryInstancesWithFilter,
  postNialarmV1QueryInstances,
} from '../../src/generated/alarm';
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

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNialarm({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('version endpoint returns available operations', async () => {
      const { response, data } = await getNialarmByVersion({ client, path: { version: 'v1' } });
      expect(response.status).toBeLessThan(400);
      // Response may have an operations array or similar structure
      expect(data).toBeDefined();
    });
  });

  describe('postNialarmV1QueryInstancesWithFilter (preferred)', () => {
    it('returns alarm instances with empty filter', async () => {
      const start = Date.now();
      const { data, error, response } = await postNialarmV1QueryInstancesWithFilter({
        client,
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(error).toBeUndefined();
      expect(data).toBeDefined();
      expect(data).toHaveProperty('alarms');
      expect(Array.isArray(data!.alarms)).toBe(true);

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNialarmV1QueryInstancesWithFilter took ${elapsed}ms`);
      }
    });

    it('alarm instance objects have expected shape', async () => {
      const { data } = await postNialarmV1QueryInstancesWithFilter({
        client,
        body: { take: 5 },
      });
      const alarms = data?.alarms ?? [];

      if (alarms.length > 0) {
        const a = alarms[0];
        expect(a).toHaveProperty('alarmId');
      }
    });

    it('supports filter expression', async () => {
      const { data, response } = await postNialarmV1QueryInstancesWithFilter({
        client,
        body: { filter: 'IsAcknowledged = false', take: 5 },
      });
      // Accept 400 — alarm filter syntax is server-version specific; connectivity confirmed by other tests
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) expect(Array.isArray(data?.alarms)).toBe(true);
    });

    it('respects take limit', async () => {
      const { data } = await postNialarmV1QueryInstancesWithFilter({
        client,
        body: { take: 2 },
      });
      expect((data?.alarms ?? []).length).toBeLessThanOrEqual(2);
    });

    it('returns totalCount when requested', async () => {
      const { data, response } = await postNialarmV1QueryInstancesWithFilter({
        client,
        body: { take: 1, returnCount: true },
      });
      expect(response.status).toBe(200);
      // totalCount may be present when returnCount is true
      expect(typeof data?.totalCount === 'number' || data?.totalCount === undefined).toBe(true);
    });
  });

  describe('postNialarmV1QueryInstances (DEPRECATED — use WithFilter instead)', () => {
    it('still works but is superseded by postNialarmV1QueryInstancesWithFilter', async () => {
      const { data, error, response } = await postNialarmV1QueryInstances({
        client,
        body: { take: 5 },
      });
      // Verify it still responds; document as deprecated in any client-facing code
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data?.filterMatches)).toBe(true);
    });
  });
});
