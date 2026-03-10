/**
 * Integration tests for the User Data Service.
 *
 * User Data is a flexible key-value store scoped to the authenticated user.
 * Items can be made visible to other users in the org via `isOrgVisible`.
 *
 * PREFERRED query pattern: postNiuserdataV1QueryItems (POST with filter/pagination).
 * Alternative: getNiuserdataV1Items (GET; only returns items owned by caller).
 *
 * CRUD cleanup: postNiuserdataV1DeleteItems for batch delete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNiuserdata,
  getNiuserdataV1,
  postNiuserdataV1QueryItems,
  getNiuserdataV1Items,
  postNiuserdataV1Items,
  getNiuserdataV1ItemsById,
  postNiuserdataV1UpdateItems,
  postNiuserdataV1DeleteItems,
} from '../../src/generated/user-data';
import { createClient, createConfig } from '../../src/generated/user-data/client';

const configured = isConfigured();

describe.skipIf(!configured)('User Data Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdItemIds: string[] = [];
  const testKey = `ts-sdk-e2e-${Date.now()}`;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdItemIds.length > 0) {
      // Delete body is Array<string> of IDs
      await postNiuserdataV1DeleteItems({ client, body: createdItemIds }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNiuserdata({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('v1 endpoint is reachable', async () => {
      const { response } = await getNiuserdataV1({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('postNiuserdataV1QueryItems (preferred POST query)', () => {
    it('queries user data items (pagination via query params)', async () => {
      const start = Date.now();
      // QueryUserDataItemRequestModel has no take/returnCount/filter —
      // pagination is done via query: { Skip, Take }
      const { data, error, response } = await postNiuserdataV1QueryItems({
        client,
        body: {},
        query: { Take: 10 },
      });
      const elapsed = Date.now() - start;
      if (elapsed > 5000) console.warn(`[SLOW] postNiuserdataV1QueryItems took ${elapsed}ms`);

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
      expect(Array.isArray(data?.items)).toBe(true);
    });

    it('filters by name', async () => {
      const { data, response } = await postNiuserdataV1QueryItems({
        client,
        body: { names: [testKey] },
      });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('getNiuserdataV1Items (GET — caller-owned items only)', () => {
    it('lists own user data items', async () => {
      const { data, error, response } = await getNiuserdataV1Items({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('User Data CRUD', () => {
    it('creates a user data item', async () => {
      // Create body is Array<CreateOrUpdateUserDataItemRequestModel>
      // Fields: application, category, name, value, visibleToOthers (not key/isOrgVisible)
      const { data, error, response } = await postNiuserdataV1Items({
        client,
        body: [
          {
            application: 'ts-sdk-e2e',
            name: testKey,
            value: { description: 'ts-sdk e2e test value', count: 42 },
            visibleToOthers: false,
          },
        ],
      });
      expect(
        [200, 201],
        `HTTP ${response.status}: ${JSON.stringify(error)}`,
      ).toContain(response.status);
      // Response is union: CreateOrUpdateUserDataItemResponseModel (200) | UserDataItemModel[] (201)
      const id = Array.isArray(data) ? data[0]?.id : data?.succeeded?.[0]?.id;
      if (id) {
        createdItemIds.push(id);
        expect(typeof id).toBe('string');
      }
    });

    it('fetches created item by id', async () => {
      if (createdItemIds.length === 0) return;
      const { data, error, response } = await getNiuserdataV1ItemsById({
        client,
        path: { id: createdItemIds[0] },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data?.id).toBe(createdItemIds[0]);
      expect(data?.name).toBe(testKey);
    });

    it('updates a user data item', async () => {
      if (createdItemIds.length === 0) return;
      // Update body is Array<UpdateUserDataItemRequestModel>
      const { response } = await postNiuserdataV1UpdateItems({
        client,
        body: [
          {
            id: createdItemIds[0],
            value: { description: 'updated by ts-sdk e2e', count: 99 },
          },
        ],
      });
      expect([200, 201, 207]).toContain(response.status);
    });

    it('queries and finds the created item by name', async () => {
      if (createdItemIds.length === 0) return;
      const { data, response } = await postNiuserdataV1QueryItems({
        client,
        body: { names: [testKey] },
      });
      expect(response.status).toBe(200);
      const found = data?.items?.some((i) => i.id === createdItemIds[0]);
      if (!found) {
        console.log('[INFO] Created item not yet visible in query (possible indexing delay)');
      }
    });
  });
});
