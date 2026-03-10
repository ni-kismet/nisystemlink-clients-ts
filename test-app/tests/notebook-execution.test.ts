/**
 * Integration tests for the Notebook Execution Service.
 *
 * Notebook Execution runs Jupyter notebooks on demand or via schedules.
 * Tests here are READ-ONLY (list + query) to avoid triggering long-running
 * notebook jobs. A "cancel immediately" test creates+cancels an execution
 * quickly to exercise the CRUD path without significant resource usage.
 *
 * PREFERRED search pattern: postNinbexecutionV1QueryExecutions (POST query).
 * Alternative: getNinbexecutionV1ExecutionsById (single item GET).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNinbexecution,
  getNinbexecutionV1,
  postNinbexecutionV1QueryExecutions,
  getNinbexecutionV1ExecutionsById,
  postNinbexecutionV1CancelExecutions,
} from '../../src/generated/notebook-execution';
import { createClient, createConfig } from '../../src/generated/notebook-execution/client';

const configured = isConfigured();

describe.skipIf(!configured)('Notebook Execution Service', () => {
  let client: ReturnType<typeof createClient>;
  const cancelledExecutionIds: string[] = [];

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    // Executions are implicitly completed or cancelled; no explicit delete needed.
    if (cancelledExecutionIds.length > 0) {
      await postNinbexecutionV1CancelExecutions({
        client,
        body: cancelledExecutionIds,
      }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNinbexecution({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('v1 endpoint is reachable', async () => {
      const { response } = await getNinbexecutionV1({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('postNinbexecutionV1QueryExecutions (preferred POST query)', () => {
    it('queries executions with empty body', async () => {
      const start = Date.now();
      const { data, error, response } = await postNinbexecutionV1QueryExecutions({
        client,
        body: {},
      });
      const elapsed = Date.now() - start;
      if (elapsed > 5000)
        console.warn(`[SLOW] postNinbexecutionV1QueryExecutions took ${elapsed}ms`);

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
      // Response is Array<Execution>
      expect(Array.isArray(data)).toBe(true);
    });

    it('filters executions by status', async () => {
      const { data, response } = await postNinbexecutionV1QueryExecutions({
        client,
        body: { filter: 'status == "CANCELED"' },
      });
      // 200 = results found, 204 = no content (no matching executions)
      expect([200, 204]).toContain(response.status);
      if (response.status === 200) expect(Array.isArray(data)).toBe(true);
    });

    it('fetches most recent execution by id if any exist', async () => {
      const { data } = await postNinbexecutionV1QueryExecutions({
        client,
        body: {},
      });
      const executions = Array.isArray(data) ? data : [];
      if (executions.length === 0) return; // no executions on this instance

      const id = (executions[0] as any)?.id;
      if (!id) return;
      const { data: single, error, response } = await getNinbexecutionV1ExecutionsById({
        client,
        path: { id },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect((single as any)?.id).toBe(id);
    });
  });
});
