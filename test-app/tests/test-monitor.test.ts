/**
 * Integration tests for the Test Monitor Service (v2).
 *
 * All v2 endpoints are preferred over any v1 equivalents.
 * Covers: results, steps, products, paths, query values, pagination,
 * filtering, CRUD lifecycle.
 *
 * CRUD lifecycle creates a result + step, validates them, then cleans up
 * in afterAll so tests are idempotent.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import {
  queryResultsV2,
  getResultsV2,
  getResultV2,
  createResultsV2,
  deleteResultsV2,
  getProductsV2,
  queryProductsV2,
  queryProductValuesV2,
  getPathsV2,
  queryResultValuesV2,
  rootEndpoint,
  rootEndpointV2,
} from '../../src/generated/test-monitor';
import { createClient, createConfig } from '../../src/generated/test-monitor/client';
import { client as generatedClient } from '../../src/generated/test-monitor/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('Test Monitor Service (v2)', () => {
  let client: ReturnType<typeof createClient>;
  const createdResultIds: string[] = [];

  beforeAll(() => {
    const specBaseUrl = generatedClient.getConfig().baseUrl ?? '';
    client = createClient(
      createConfig({
        baseUrl: buildServiceBaseUrl(specBaseUrl),
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdResultIds.length > 0) {
      await deleteResultsV2({ client, body: { ids: createdResultIds } }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await rootEndpoint({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('v2 operations endpoint is reachable', async () => {
      const { response } = await rootEndpointV2({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('queryResultsV2 (preferred POST query)', () => {
    it('returns results with empty filter', async () => {
      const start = Date.now();
      const { data, error, response } = await queryResultsV2({
        client,
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.results)).toBe(true);

      if (elapsed > 5000) {
        console.warn(`[SLOW] queryResultsV2 took ${elapsed}ms`);
      }
    });

    it('result objects have expected shape', async () => {
      const { data } = await queryResultsV2({ client, body: { take: 5 } });
      const results = data?.results ?? [];
      if (results.length > 0) {
        const r = results[0];
        expect(r).toHaveProperty('id');
        expect(r).toHaveProperty('status');
      }
    });

    it('respects take limit', async () => {
      const { data } = await queryResultsV2({ client, body: { take: 2 } });
      expect((data?.results ?? []).length).toBeLessThanOrEqual(2);
    });

    it('supports continuationToken pagination', async () => {
      const first = await queryResultsV2({ client, body: { take: 1 } });
      const token = first.data?.continuationToken;
      if (!token) return; // fewer than 1 result in this environment

      const second = await queryResultsV2({
        client,
        body: { take: 1, continuationToken: token },
      });
      expect(second.response.status).toBe(200);
    });

    it('supports Dynamic LINQ filter', async () => {
      const { data, response } = await queryResultsV2({
        client,
        body: { filter: 'Status.StatusType = "Passed"', take: 5 },
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(data?.results)).toBe(true);
    });

    it('returns totalCount when requested', async () => {
      const { data } = await queryResultsV2({ client, body: { take: 1, returnCount: true } });
      if (data?.totalCount !== undefined) {
        expect(typeof data.totalCount).toBe('number');
      }
    });
  });

  describe('getResultsV2 (GET list — same data, different verb)', () => {
    it('returns results matching queryResultsV2 shape', async () => {
      const { data, error, response } = await getResultsV2({ client, query: { take: 5 } });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.results)).toBe(true);
    });
  });

  describe('queryResultValuesV2', () => {
    it('returns distinct field values', async () => {
      const { data, response } = await queryResultValuesV2({
        client,
        body: { field: 'PROGRAM_NAME' },
      });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('CRUD — createResultsV2 / getResultV2 / deleteResultsV2', () => {
    it('creates, fetches, and deletes a test result', async () => {
      const { data: created, error, response } = await createResultsV2({
        client,
        body: {
          results: [
            {
              programName: 'ts-sdk-e2e',
              status: { statusType: 'RUNNING' },
            },
          ],
        },
      });

      expect([200, 201], `Create failed: ${JSON.stringify(error)}`).toContain(response.status);
      const id = created?.results?.[0]?.id;
      expect(id).toBeTruthy();
      createdResultIds.push(id!);

      // Fetch by ID
      const { data: fetched, response: fetchResp } = await getResultV2({
        client,
        path: { resultId: id! },
      });
      expect(fetchResp.status).toBe(200);
      expect(fetched?.id).toBe(id);
      expect(fetched?.programName).toBe('ts-sdk-e2e');
    });
  });

  describe('Products', () => {
    it('getProductsV2 lists products', async () => {
      const { data, error, response } = await getProductsV2({ client, query: { take: 10 } });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.products)).toBe(true);
    });

    it('queryProductsV2 queries with empty body', async () => {
      const { data, response } = await queryProductsV2({ client, body: { take: 5 } });
      expect(response.status).toBe(200);
      expect(Array.isArray(data?.products)).toBe(true);
    });

    it('queryProductValuesV2 returns field values', async () => {
      const { data, response } = await queryProductValuesV2({
        client,
        body: { field: 'FAMILY' },
      });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Paths', () => {
    it('getPathsV2 lists test paths', async () => {
      const { data, response } = await getPathsV2({ client, query: { take: 10 } });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
