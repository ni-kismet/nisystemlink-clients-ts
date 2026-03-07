/**
 * Integration tests for the User Service.
 *
 * Validates workspaces and users.  The slcli workspace_click.py uses
 * GET /niuser/v1/workspaces — this test verifies that endpoint behaves
 * as documented and the typed response matches reality.
 *
 * Set SYSTEMLINK_API_URL and SYSTEMLINK_API_KEY environment variables
 * (or add them to .env) before running.  Tests are skipped automatically
 * when the variables are absent.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import { getWorkspaces, queryUsers } from '../../src/generated/user';
import { createClient, createConfig } from '../../src/generated/user/client';
// Read the spec baseUrl (includes /niuser/v1 path prefix) so we keep it
// when pointing at a custom server host.
import { client as generatedClient } from '../../src/generated/user/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('User Service', () => {
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

  it('lists workspaces', async () => {
    const { data, error, response } = await getWorkspaces({ client });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('workspaces');
    expect(Array.isArray(data!.workspaces)).toBe(true);
  });

  it('workspace objects have expected shape', async () => {
    const { data } = await getWorkspaces({ client });
    const workspaces = data?.workspaces ?? [];

    if (workspaces.length > 0) {
      const ws = workspaces[0];
      expect(ws).toHaveProperty('id');
      expect(ws).toHaveProperty('name');
      expect(typeof ws.id).toBe('string');
      expect(typeof ws.name).toBe('string');
    }
  });

  it('queries users', async () => {
    const { data, error, response } = await queryUsers({
      client,
      body: { take: 5 },
    });

    expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
    expect(data).toBeDefined();
    expect(Array.isArray(data!.users)).toBe(true);
  });
});
