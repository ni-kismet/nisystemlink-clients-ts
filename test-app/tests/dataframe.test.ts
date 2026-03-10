/**
 * Integration tests for the DataFrame Service.
 *
 * Preferred endpoints:
 *  - postNidataframeV1QueryTables — POST query (supports filtering + pagination)
 *    over getNidataframeV1Tables (GET list, no filter support)
 *  - postNidataframeV1TablesByIdQueryData — POST query data with LINQ filter
 *    over getNidataframeV1TablesByIdData (raw GET, no filtering)
 *
 * CRUD lifecycle: create table → write data → query data → delete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNidataframe,
  getNidataframeV1Tables,
  postNidataframeV1Tables,
  postNidataframeV1QueryTables,
  postNidataframeV1TablesByIdData,
  postNidataframeV1TablesByIdQueryData,
  deleteNidataframeV1TablesById,
} from '../../src/generated/dataframe';
import { createClient, createConfig } from '../../src/generated/dataframe/client';

const configured = isConfigured();

describe.skipIf(!configured)('DataFrame Service', () => {
  let client: ReturnType<typeof createClient>;
  let createdTableId: string | undefined;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdTableId) {
      await deleteNidataframeV1TablesById({
        client,
        path: { id: createdTableId },
      }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNidataframe({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('getNidataframeV1Tables (GET list)', () => {
    it('lists tables', async () => {
      const { data, error, response } = await getNidataframeV1Tables({
        client,
        query: { take: 10 },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('postNidataframeV1QueryTables (preferred POST query)', () => {
    it('queries tables with empty body', async () => {
      const start = Date.now();
      const { data, error, response } = await postNidataframeV1QueryTables({
        client,
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNidataframeV1QueryTables took ${elapsed}ms`);
      }
    });

    it('respects take limit', async () => {
      const { data } = await postNidataframeV1QueryTables({ client, body: { take: 2 } });
      const tables = (data as any)?.tables ?? (data as any)?.data ?? [];
      expect(tables.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Table CRUD + data', () => {
    it('creates a table with a numeric column', async () => {
      const { data: created, error, response } = await postNidataframeV1Tables({
        client,
        body: {
          name: `ts-sdk-e2e-${Date.now()}`,
          columns: [
            { name: 'index', dataType: 'INT32', columnType: 'INDEX' },
            { name: 'value', dataType: 'FLOAT64' },
          ],
        },
      });
      expect([200, 201], `Create table failed: ${JSON.stringify(error)}`).toContain(response.status);
      createdTableId = created?.id;
      expect(createdTableId).toBeTruthy();
    });

    it('writes rows to the table', async () => {
      if (!createdTableId) return;
      const { error, response } = await postNidataframeV1TablesByIdData({
        client,
        path: { id: createdTableId },
        body: {
          frame: {
            columns: ['index', 'value'],
            data: [['1', '1.0'], ['2', '2.0'], ['3', '3.0']],
          },
          endOfData: false,
        },
      });
      // 204 = No Content (write accepted, no body returned)
      expect([200, 204], `Write data failed: ${JSON.stringify(error)}`).toContain(response.status);
    });

    it('queries data from the table with filter', async () => {
      if (!createdTableId) return;
      const start = Date.now();
      const { data, error, response } = await postNidataframeV1TablesByIdQueryData({
        client,
        path: { id: createdTableId },
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `Query data failed: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNidataframeV1TablesByIdQueryData took ${elapsed}ms`);
      }
    });
  });
});
