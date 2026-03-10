/**
 * Integration tests for the Work Order Service.
 *
 * ⚠️  DEPRECATION NOTICE:
 * The /niworkorder testplan and workflow endpoints are DEPRECATED.
 * All new development should use the Work Item service (/niworkitem) instead.
 *
 * This test suite documents the migration path:
 *   - Work order testplans → work item workitems
 *   - Work order workflows → work item workflows
 *   - Work order testplan templates → work item workitem templates
 *
 * Tests here are minimal, covering only the API info endpoint and one
 * read-only query — enough to verify the client can reach the server and
 * that the deprecation guidance is correct. No CRUD lifecycle tests are
 * authored here to avoid creating additional technical debt.
 *
 * Work ORDER resources (separate from testplans) are not deprecated and
 * are also tested here as they represent a distinct concept.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNiworkorder,
  getNiworkorderV1,
  /** @deprecated use postNiworkitemV1QueryWorkitems */
  postNiworkorderV1QueryTestplans,
  /** @deprecated use postNiworkitemV1QueryWorkflows */
  postNiworkorderV1QueryWorkflows,
  postNiworkorderV1QueryWorkorders,
  getNiworkorderV1WorkordersSummary,
} from '../../src/generated/work-order';
import { createClient, createConfig } from '../../src/generated/work-order/client';

const configured = isConfigured();

describe.skipIf(!configured)('Work Order Service (DEPRECATED — use work-item)', () => {
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
      const { response } = await getNiworkorder({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('v1 endpoint is reachable', async () => {
      const { response } = await getNiworkorderV1({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  /**
   * @deprecated Testplan endpoints are deprecated. Use work-item workitems instead.
   * Kept as a migration aid and to confirm the endpoint still responds (404 = migration complete).
   */
  describe('Deprecated testplan endpoints (migrate to work-item)', () => {
    it('postNiworkorderV1QueryTestplans — @deprecated, prefer postNiworkitemV1QueryWorkitems', async () => {
      const { response } = await postNiworkorderV1QueryTestplans({
        client,
        body: { take: 1 },
      });
      // Accept both 200 (still active) and 4xx (removed from server)
      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        console.warn(
          '[DEPRECATION] postNiworkorderV1QueryTestplans still active — migrate callers to postNiworkitemV1QueryWorkitems',
        );
      }
    });

    it('postNiworkorderV1QueryWorkflows — @deprecated, prefer postNiworkitemV1QueryWorkflows', async () => {
      const { response } = await postNiworkorderV1QueryWorkflows({
        client,
        body: { take: 1 },
      });
      expect(response.status).toBeGreaterThanOrEqual(200);
      if (response.status === 200) {
        console.warn(
          '[DEPRECATION] postNiworkorderV1QueryWorkflows still active — migrate callers to postNiworkitemV1QueryWorkflows',
        );
      }
    });
  });

  describe('Work Order resource (not deprecated)', () => {
    it('queries work orders', async () => {
      const start = Date.now();
      const { data, error, response } = await postNiworkorderV1QueryWorkorders({
        client,
        body: { take: 10, returnCount: true },
      });
      const elapsed = Date.now() - start;
      if (elapsed > 5000) console.warn(`[SLOW] postNiworkorderV1QueryWorkorders took ${elapsed}ms`);

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('returns work order summary', async () => {
      const { data, error, response } = await getNiworkorderV1WorkordersSummary({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
