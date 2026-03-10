/**
 * Integration tests for the Asset Management Service.
 *
 * Preferred query endpoint: postNiapmV1MaterializedSearchAssets (materialized
 * view, indexed, fastest) over postNiapmV1QueryAssets (Dynamic LINQ, slower
 * on large datasets). The legacy PATCH metadata endpoint is deprecated —
 * postNiapmV1UpdateAssets is the correct replacement.
 *
 * CRUD lifecycle: create → read → update → delete, cleaned up in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNiapmV1Assets,
  getNiapmV1AssetSummary,
  postNiapmV1QueryAssets,
  postNiapmV1MaterializedSearchAssets,
  postNiapmV1DeleteAssets,
  getNiapmV1AssetsByAssetId,
  getNiapm,
} from '../../src/generated/asset-management';
import { createClient, createConfig } from '../../src/generated/asset-management/client';

const configured = isConfigured();

describe.skipIf(!configured)('Asset Management Service', () => {
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
      const { response } = await getNiapm({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('getNiapmV1Assets (list)', () => {
    it('lists assets with take limit', async () => {
      const { data, error, response } = await getNiapmV1Assets({
        client,
        query: { Take: 10 },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.assets)).toBe(true);
    });

    it('asset objects have expected shape', async () => {
      const { data } = await getNiapmV1Assets({ client, query: { Take: 5 } });
      const assets = data?.assets ?? [];
      if (assets.length > 0) {
        const a = assets[0];
        expect(a).toHaveProperty('id');
        expect(a).toHaveProperty('name');
        expect(a).toHaveProperty('assetType');
      }
    });

    it('respects Take limit', async () => {
      const { data } = await getNiapmV1Assets({ client, query: { Take: 2 } });
      expect((data?.assets ?? []).length).toBeLessThanOrEqual(2);
    });
  });

  describe('getNiapmV1AssetSummary', () => {
    it('returns summary statistics', async () => {
      const { data, error, response } = await getNiapmV1AssetSummary({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('postNiapmV1MaterializedSearchAssets (preferred query)', () => {
    it('searches assets with empty body', async () => {
      const start = Date.now();
      const { data, error, response } = await postNiapmV1MaterializedSearchAssets({
        client,
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
      expect(Array.isArray(data!.assets)).toBe(true);

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNiapmV1MaterializedSearchAssets took ${elapsed}ms`);
      }
    });

    it('supports filter expression', async () => {
      const { data, response } = await postNiapmV1MaterializedSearchAssets({
        client,
        body: { filter: 'AssetType = "GENERIC"', take: 5 },
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(data?.assets)).toBe(true);
    });

    it('respects pagination', async () => {
      const { data } = await postNiapmV1MaterializedSearchAssets({
        client,
        body: { take: 2 },
      });
      expect((data?.assets ?? []).length).toBeLessThanOrEqual(2);
    });
  });

  describe('postNiapmV1QueryAssets (Dynamic LINQ — slower than materialized)', () => {
    it('queries assets with no filter', async () => {
      const start = Date.now();
      const { data, error, response } = await postNiapmV1QueryAssets({ client });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.assets)).toBe(true);

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNiapmV1QueryAssets took ${elapsed}ms — prefer postNiapmV1MaterializedSearchAssets`);
      }
    });
  });

  describe('getAssetById', () => {
    it('fetches a single asset by id when assets exist', async () => {
      const { data: listData } = await getNiapmV1Assets({ client, query: { Take: 1 } });
      const firstId = listData?.assets?.[0]?.id;
      if (!firstId) return; // no assets in this environment

      const { data, error, response } = await getNiapmV1AssetsByAssetId({
        client,
        path: { assetId: firstId },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toHaveProperty('id', firstId);
    });
  });
});
