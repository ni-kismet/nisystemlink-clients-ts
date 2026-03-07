/**
 * Integration tests for the Feeds Service.
 *
 * Validates feed listing.  The slcli feed_click.py uses GET /nifeed/v1/feeds
 * to list package feeds — these tests confirm the TypeScript client produces
 * compatible requests.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import { getNifeedV1Feeds } from '../../src/generated/feeds';
import { createClient, createConfig } from '../../src/generated/feeds/client';

const configured = isConfigured();

describe.skipIf(!configured)('Feeds Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  it('lists feeds', async () => {
    const { data, error, response } = await getNifeedV1Feeds({ client });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data!.feeds)).toBe(true);
  });

  it('feed objects have expected shape', async () => {
    const { data } = await getNifeedV1Feeds({ client });
    const feeds = data?.feeds ?? [];

    if (feeds.length > 0) {
      const f = feeds[0];
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('name');
      expect(f).toHaveProperty('platform');
    }
  });
});
