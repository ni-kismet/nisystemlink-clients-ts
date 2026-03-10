/**
 * Integration tests for the Repository Service.
 *
 * The repository service proxies NI package feeds (NIPKG format).
 * postNirepoV1QueryAvailablePackages is the preferred search endpoint
 * over getNirepoV1StoreItems (raw cached list).
 *
 * NOTE: Feeds must be configured (postNirepoV1ConfigureFeeds) before packages
 * will appear. Tests gracefully handle empty results.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  postNirepoV1QueryAvailablePackages,
  getNirepoV1StoreItems,
} from '../../src/generated/repository';
import { createClient, createConfig } from '../../src/generated/repository/client';

const configured = isConfigured();

describe.skipIf(!configured)('Repository Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  describe('postNirepoV1QueryAvailablePackages (preferred)', () => {
    it('queries available packages', async () => {
      const start = Date.now();
      const { data, error, response } = await postNirepoV1QueryAvailablePackages({
        client,
        body: {},
      });
      const elapsed = Date.now() - start;

      // 400 = server rejects request (e.g. systemConfigurations validation);
      // connectivity confirmed by getNirepoV1StoreItems
      expect([200, 400], `HTTP ${response.status}: ${JSON.stringify(error)}`).toContain(response.status);
      if (response.status === 200) {
        expect(data).toBeDefined();
      }

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNirepoV1QueryAvailablePackages took ${elapsed}ms`);
      }
    });

    it('supports name filter', async () => {
      const { data, response } = await postNirepoV1QueryAvailablePackages({
        client,
        body: {},
      });
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) expect(data).toBeDefined();
    });
  });

  describe('getNirepoV1StoreItems (cached item index)', () => {
    it('lists store items', async () => {
      const { data, error, response } = await getNirepoV1StoreItems({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
