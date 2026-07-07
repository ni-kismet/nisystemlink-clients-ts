/**
 * Integration tests for the Notebook Service.
 *
 * Validates notebook querying.  The slcli notebook_click.py uses the same
 * notebook service — these tests verify that the TypeScript SDK surface is
 * correct and that the spec-generated types match real API responses.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import { query as queryNotebooks } from '../../src/generated/notebook';
import { createClient, createConfig } from '../../src/generated/notebook/client';
import { client as generatedClient } from '../../src/generated/notebook/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('Notebook Service', () => {
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

  it('queries notebooks', async () => {
    const { data, error, response } = await queryNotebooks({
      client,
      body: { take: 10 },
    });

    expect(response!.status, `HTTP ${response!.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data!.notebooks)).toBe(true);
  });

  it('notebook objects have expected shape', async () => {
    const { data } = await queryNotebooks({ client, body: { take: 5 } });
    const notebooks = data?.notebooks ?? [];

    if (notebooks.length > 0) {
      const n = notebooks[0];
      expect(n).toHaveProperty('id');
    }
  });
});
