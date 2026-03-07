/**
 * Integration tests for the Asset Management Service.
 *
 * Validates asset listing and querying.  The slcli asset_click.py uses these
 * same endpoints — comparing the typed TypeScript response against the Python
 * CLI output can catch undocumented fields or field naming discrepancies.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import { getNiapmV1Assets, postNiapmV1QueryAssets, getNiapmV1AssetSummary } from '../../src/generated/asset-management';
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

  it('lists assets', async () => {
    const { data, error, response } = await getNiapmV1Assets({
      client,
      query: { Take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
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

  it('queries assets with POST body', async () => {
    // QueryAssetsRequest doesn't have take/skip — call with no filter to get first page
    const { data, error, response } = await postNiapmV1QueryAssets({
      client,
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(Array.isArray(data!.assets)).toBe(true);
  });

  it('returns asset summary', async () => {
    const { data, error, response } = await getNiapmV1AssetSummary({ client });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(data).toBeDefined();
  });
});
