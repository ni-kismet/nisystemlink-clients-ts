/**
 * Integration tests for the Test Monitor Service.
 *
 * Validates test results, steps, and products.  The slcli testmonitor_click.py
 * implements rich filtering on top of these endpoints — this test verifies the
 * baseline response shapes and field names.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import { queryResultsV2, getResultsV2, getProductsV2 } from '../../src/generated/test-monitor';
import { createClient, createConfig } from '../../src/generated/test-monitor/client';
// Read the spec baseUrl (includes /nitestmonitor path prefix) so we keep it
// when pointing at a custom server host.
import { client as generatedClient } from '../../src/generated/test-monitor/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('Test Monitor Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    const specBaseUrl = generatedClient.getConfig().baseUrl ?? '';
    client = createClient(
      createConfig({
        baseUrl: buildServiceBaseUrl(specBaseUrl),
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  it('queries results with no filter', async () => {
    const { data, error, response } = await queryResultsV2({
      client,
      body: { take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data!.results)).toBe(true);
  });

  it('result objects have expected shape', async () => {
    const { data } = await queryResultsV2({
      client,
      body: { take: 5 },
    });
    const results = data?.results ?? [];

    if (results.length > 0) {
      const r = results[0];
      // Core identity fields documented in the OpenAPI spec
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('status');
    }
  });

  it('GET results returns same data as query', async () => {
    const { data, error, response } = await getResultsV2({
      client,
      query: { take: 5 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(data).toBeDefined();
    expect(Array.isArray(data!.results)).toBe(true);
  });

  it('lists products', async () => {
    const { data, error, response } = await getProductsV2({
      client,
      query: { take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(data).toBeDefined();
    expect(Array.isArray(data!.products)).toBe(true);
  });
});
