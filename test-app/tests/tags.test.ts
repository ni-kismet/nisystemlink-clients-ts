/**
 * Integration tests for the Tags Service.
 *
 * Preferred patterns:
 *  - getTags / queryTagsWithValues for listing (NOT the legacy getTagsOld)
 *  - Selections API for grouping tags for dashboard-style reads
 *  - Workspace-scoped operations where available
 *
 * CRUD lifecycle: create tag → read → update value → delete.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured, buildServiceBaseUrl } from '../../src/client';
import {
  getTags,
  createOrUpdateTags,
  deleteTag,
  getTag,
  updateTagCurrentValue,
  getTagCurrentValue,
  queryTagsWithValues,
  rootEndpoint,
  rootEndpointWithVersion,
  getSelections,
  createSelection,
  deleteSelection,
} from '../../src/generated/tags';
import { createClient, createConfig } from '../../src/generated/tags/client';
import { client as generatedClient } from '../../src/generated/tags/client.gen';

const configured = isConfigured();
const TEST_TAG_PATH = `ts-sdk-e2e-${Date.now()}`;

describe.skipIf(!configured)('Tags Service', () => {
  let client: ReturnType<typeof createClient>;
  let createdTagPath: string | undefined;
  let createdSelectionId: string | undefined;

  beforeAll(async () => {
    const specBaseUrl = generatedClient.getConfig().baseUrl ?? '';
    client = createClient(
      createConfig({
        baseUrl: buildServiceBaseUrl(specBaseUrl),
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );

    // Create a test tag for use in subsequent tests
    const { data } = await createOrUpdateTags({
      client,
      body: {
        tags: [{ path: TEST_TAG_PATH, type: 'DOUBLE', keywords: ['e2e-test'] }],
      },
    });
    createdTagPath = TEST_TAG_PATH;
  });

  afterAll(async () => {
    if (createdTagPath) {
      await deleteTag({ client, path: { path: createdTagPath } }).catch(() => {});
    }
    if (createdSelectionId) {
      await deleteSelection({ client, path: { id: createdSelectionId } }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await rootEndpoint({ client });
      // /nitag returns 404 on some instances — accept any non-server-error status
      expect(response.status).toBeLessThan(500);
    });

    it('version endpoint is reachable', async () => {
      const { response } = await rootEndpointWithVersion({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('getTags (list)', () => {
    it('lists tags', async () => {
      const { data, error, response } = await getTags({ client, query: { take: 10 } });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
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

    it('respects take limit', async () => {
      const { data } = await getTags({ client, query: { take: 2 } });
      expect((data?.tags ?? []).length).toBeLessThanOrEqual(2);
    });
  });

  describe('queryTagsWithValues (preferred — includes current values)', () => {
    it('returns tags with current values', async () => {
      const start = Date.now();
      const { data, error, response } = await queryTagsWithValues({
        client,
        body: { take: 10 },
      });
      const elapsed = Date.now() - start;

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();

      if (elapsed > 5000) {
        console.warn(`[SLOW] queryTagsWithValues took ${elapsed}ms`);
      }
    });
  });

  describe('Tag CRUD', () => {
    it('created test tag is retrievable', async () => {
      const { data, error, response } = await getTag({
        client,
        path: { path: createdTagPath! },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toHaveProperty('path', createdTagPath);
    });

    it('can write and read a tag value', async () => {
      await updateTagCurrentValue({
        client,
        path: { path: createdTagPath! },
        body: { value: { type: 'DOUBLE', value: '42.0' } },
      });

      const { data, response } = await getTagCurrentValue({
        client,
        path: { path: createdTagPath! },
      });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Selections API', () => {
    it('lists selections', async () => {
      const { data, response } = await getSelections({ client });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it('creates and deletes a selection', async () => {
      const { data, response } = await createSelection({
        client,
        body: { searchPaths: [createdTagPath!] },
      });
      expect(response.status).toBe(200);
      createdSelectionId = data?.id;
      expect(createdSelectionId).toBeTruthy();
    });
  });
});
