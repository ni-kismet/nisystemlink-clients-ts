/**
 * Integration tests for the Tag Service.
 *
 * Validates tag listing and selection queries.  The slcli tag_click.py uses
 * the same tags API — these tests verify that typed TypeScript clients produce
 * valid API calls and that the response shapes are accurate.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import { getTags } from '../../src/generated/tags';
import { createClient, createConfig } from '../../src/generated/tags/client';
// Read the spec baseUrl (includes /nitag path prefix) so we keep it
// when pointing at a custom server host.
import { client as generatedClient } from '../../src/generated/tags/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('Tag Service', () => {
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

  it('lists tags', async () => {
    const { data, error, response } = await getTags({
      client,
      query: { take: 10 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data!.tags)).toBe(true);
  });

  it('tag objects have expected shape', async () => {
    const { data } = await getTags({ client, query: { take: 5 } });
    const tags = data?.tags ?? [];

    if (tags.length > 0) {
      const t = tags[0];
      expect(t).toHaveProperty('path');
      expect(t).toHaveProperty('type');
    }
  });
});
