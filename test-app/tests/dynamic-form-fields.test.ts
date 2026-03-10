/**
 * Integration tests for the Dynamic Form Fields Service.
 *
 * DFF configurations drive form metadata for work items, assets, etc.
 * Preferred: postNidynamicformfieldsV1QueryResolvedConfigurations for reading
 * configurations by resource type. The getNidynamicformfieldsUp status
 * endpoint is deprecated — use the root endpoint instead.
 *
 * NOTE: workorder:testplan resource type is auto-converted to workitem:workitem
 * internally; tests should use workitem:workitem going forward.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNidynamicformfields,
  getNidynamicformfieldsV1Configurations,
  getNidynamicformfieldsV1Groups,
  getNidynamicformfieldsV1Fields,
  postNidynamicformfieldsV1QueryResolvedConfigurations,
  postNidynamicformfieldsV1QueryTables,
} from '../../src/generated/dynamic-form-fields';
import { createClient, createConfig } from '../../src/generated/dynamic-form-fields/client';

const configured = isConfigured();

describe.skipIf(!configured)('Dynamic Form Fields Service', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNidynamicformfields({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('Configurations', () => {
    it('lists configurations', async () => {
      const { data, error, response } = await getNidynamicformfieldsV1Configurations({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('queries resolved configurations (preferred)', async () => {
      const start = Date.now();
      const { data, error, response } = await postNidynamicformfieldsV1QueryResolvedConfigurations({
        client,
        body: { resourceType: 'workitem:workitem' },
      });
      const elapsed = Date.now() - start;

      // NOTE: workorder:testplan is auto-converted internally — use workitem:workitem
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();

      if (elapsed > 5000) {
        console.warn(`[SLOW] postNidynamicformfieldsV1QueryResolvedConfigurations took ${elapsed}ms`);
      }
    });
  });

  describe('Groups and Fields (metadata)', () => {
    it('lists groups', async () => {
      const { data, error, response } = await getNidynamicformfieldsV1Groups({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('lists fields', async () => {
      const { data, error, response } = await getNidynamicformfieldsV1Fields({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Tables', () => {
    it('queries tables (body is optional — omit to retrieve all)', async () => {
      // QueryTablePropertiesRequest requires workspace, resourceType, and resourceId.
      // Use a synthetic resource; server returns 200 with empty list for unknown resources.
      const { data, error, response } = await postNidynamicformfieldsV1QueryTables({
        client,
        body: {
          workspace: 'default',
          resourceType: 'workitem:workitem',
          resourceId: 'ts-sdk-e2e-dummy',
        },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
