/**
 * Integration tests for the Tag Historian Service.
 *
 * Tag Historian stores time-series history for Tag values. Tests here are
 * READ-ONLY because writing tag history requires live tag subscriptions
 * (the tag service writes history automatically when tag values change).
 *
 * NOTE: This service has a path-prefixed baseUrl (`/nitaghistorian`), so
 * the `buildServiceBaseUrl` helper must be used to construct the correct URL.
 *
 * Tests query history for any tags that have been recently written to.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import {
  rootEndpoint,
  rootEndpointWithVersion,
  queryHistory,
  queryDecimatedHistory,
} from '../../src/generated/tag-historian';
import { createClient, createConfig } from '../../src/generated/tag-historian/client';

const configured = isConfigured();

describe.skipIf(!configured)('Tag Historian Service', () => {
  let client: ReturnType<typeof createClient>;
  // Test tag path - the SDK e2e tests also write to this tag via the tags test
  const testTagPath = `ts-sdk-e2e-${Date.now()}`;

  beforeAll(() => {
    // Tag historian has a path-specific baseUrl — use buildServiceBaseUrl
    const specBaseUrl = 'https://dev-api.lifecyclesolutions.ni.com/nitaghistorian';
    client = createClient(
      createConfig({
        baseUrl: buildServiceBaseUrl(specBaseUrl),
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await rootEndpoint({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('version endpoint is reachable', async () => {
      const { response } = await rootEndpointWithVersion({
        client,
        path: { version: 'v2' },
      });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('queryHistory', () => {
    it('returns history data structure for a tag query', async () => {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const start = Date.now();
      const { data, error, response } = await queryHistory({
        client,
        body: {
          path: testTagPath,
          startTime: anHourAgo.toISOString(),
          endTime: now.toISOString(),
          take: 10,
        },
      });
      const elapsed = Date.now() - start;
      if (elapsed > 5000) console.warn(`[SLOW] queryHistory took ${elapsed}ms`);

      // 200 if history exists; 200 with empty results if no data
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('accepts time-range query with valid ISO timestamps', async () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { response } = await queryHistory({
        client,
        body: {
          startTime: oneWeekAgo.toISOString(),
          endTime: now.toISOString(),
          take: 5,
        },
      });
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('queryDecimatedHistory', () => {
    it('returns decimated history for charting', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const start = Date.now();
      const { data, error, response } = await queryDecimatedHistory({
        client,
        body: {
          paths: [testTagPath],
          startTime: oneDayAgo.toISOString(),
          endTime: now.toISOString(),
          decimation: 100,
        },
      });
      const elapsed = Date.now() - start;
      if (elapsed > 5000) console.warn(`[SLOW] queryDecimatedHistory took ${elapsed}ms`);

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
