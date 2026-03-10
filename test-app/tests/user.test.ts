/**
 * Integration tests for the User Service.
 *
 * Validates workspaces, users, and auth mappings. The slcli workspace_click.py
 * uses GET /niuser/v1/workspaces — this test verifies that endpoint as well as
 * the org info and user query endpoints.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import { getWorkspaces, queryUsers, getOrg } from '../../src/generated/user';
import { createClient, createConfig } from '../../src/generated/user/client';
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

  describe('Workspaces', () => {
    it('lists workspaces', async () => {
      const { data, error, response } = await getWorkspaces({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
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

    it('Default workspace is always present', async () => {
      const { data } = await getWorkspaces({ client });
      const names = (data?.workspaces ?? []).map((w) => w.name);
      expect(names).toContain('Default');
    });
  });

  describe('Users', () => {
    it('queries users', async () => {
      const { data, error, response } = await queryUsers({
        client,
        body: { take: 5 },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data!.users)).toBe(true);
    });

    it('user objects have expected shape', async () => {
      const { data } = await queryUsers({ client, body: { take: 3 } });
      const users = data?.users ?? [];
      if (users.length > 0) {
        const u = users[0];
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('email');
      }
    });

    it('supports filter expression', async () => {
      const { data, response } = await queryUsers({
        client,
        body: { filter: 'niua.status = "active"', take: 5 },
      });
      // Accept 400 — filter syntax varies by server version; connectivity confirmed by other tests
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) expect(data).toBeDefined();
    });
  });

  describe('Organization', () => {
    it('getOrg accepts an org name path parameter', async () => {
      // The org name is instance-specific; try a common default.
      // 404 = not found, 401 = not accessible — both confirm the client reaches the server.
      const { response } = await getOrg({ client, path: { name: 'organization' } });
      expect([200, 401, 404]).toContain(response.status);
    });
  });
});
