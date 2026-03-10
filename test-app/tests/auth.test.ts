/**
 * Integration tests for the Auth Service.
 *
 * Covers: API key auth check, key CRUD, policies, policy templates.
 * Keys and policies created during tests are cleaned up in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import {
  auth,
  user,
  getKeys,
  createKey,
  getKey,
  deleteKey,
  getPolicies,
  getPolicyTemplates,
} from '../../src/generated/auth';
import { createClient, createConfig } from '../../src/generated/auth/client';
import { client as generatedClient } from '../../src/generated/auth/client.gen';

const configured = isConfigured();

describe.skipIf(!configured)('Auth Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdKeyIds: string[] = [];

  beforeAll(() => {
    const specBaseUrl = generatedClient.getConfig().baseUrl ?? '';
    client = createClient(
      createConfig({
        baseUrl: buildServiceBaseUrl(specBaseUrl),
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    for (const id of createdKeyIds) {
      await deleteKey({ client, path: { id } }).catch(() => {});
    }
  });

  describe('auth / user info', () => {
    it('auth endpoint validates the API key', async () => {
      const { response } = await auth({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('user endpoint returns current user info', async () => {
      const { data, error, response } = await user({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
      // Response is { user: {...}, org?: {...}, workspaces?: [...], ... }
      expect(data?.user).toHaveProperty('id');
    });
  });

  describe('API Keys', () => {
    it('lists existing API keys', async () => {
      const { data, error, response } = await getKeys({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('creates and fetches an API key', async () => {
      const { data: created, error, response } = await createKey({
        client,
        body: { name: `ts-sdk-e2e-${Date.now()}` },
      });
      expect([200, 403], `Create key failed: ${JSON.stringify(error)}`).toContain(response.status);
      if (response.status === 403) {
        console.warn('[INFO] API key limit reached — cannot create new key with this account');
        return;
      }
      const id = created?.id;
      expect(id).toBeTruthy();
      createdKeyIds.push(id!);

      const { data: fetched, response: fetchResp } = await getKey({
        client,
        path: { id: id! },
      });
      expect(fetchResp.status).toBe(200);
      expect(fetched?.id).toBe(id);
    });
  });

  describe('Policies', () => {
    it('lists policies', async () => {
      const { data, error, response } = await getPolicies({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Policy Templates', () => {
    it('lists policy templates', async () => {
      const { data, error, response } = await getPolicyTemplates({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
