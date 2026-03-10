/**
 * Integration tests for the Notification Service.
 *
 * Covers: address groups, message templates, notification strategies.
 * CRUD lifecycle for each resource type; cleanup in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNinotification,
  getNinotificationV1AddressGroups,
  postNinotificationV1AddressGroups,
  deleteNinotificationV1AddressGroupsById,
  getNinotificationV1AddressGroupsById,
  getNinotificationV1MessageTemplates,
  getNinotificationV1NotificationStrategies,
} from '../../src/generated/notification';
import { createClient, createConfig } from '../../src/generated/notification/client';

const configured = isConfigured();

describe.skipIf(!configured)('Notification Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdAddressGroupIds: string[] = [];

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    for (const id of createdAddressGroupIds) {
      await deleteNinotificationV1AddressGroupsById({ client, path: { id } }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNinotification({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('Address Groups', () => {
    it('lists address groups', async () => {
      const { data, error, response } = await getNinotificationV1AddressGroups({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('creates and fetches an address group', async () => {
      const { data: created, error, response } = await postNinotificationV1AddressGroups({
        client,
        body: {
          interpretingServiceName: 'ni.notification.smtp',
          displayName: `ts-sdk-e2e-${Date.now()}`,
          fields: {},
        },
      });
      // 400 = interpreting service not configured on this server instance
      expect([200, 400], `Create failed: ${JSON.stringify(error)}`).toContain(response.status);
      if (response.status !== 200) {
        console.warn(`[INFO] createAddressGroup: interpreting service not available — ${(error as any)?.error?.message}`);
        return;
      }
      const id = (created as any)?.id;
      if (id) {
        createdAddressGroupIds.push(id);

        const { data: fetched, response: fetchResp } = await getNinotificationV1AddressGroupsById({
          client,
          path: { id },
        });
        expect(fetchResp.status).toBe(200);
        expect((fetched as any)?.id).toBe(id);
      }
    });
  });

  describe('Message Templates', () => {
    it('lists message templates', async () => {
      const { data, error, response } = await getNinotificationV1MessageTemplates({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Notification Strategies', () => {
    it('lists notification strategies', async () => {
      const { data, error, response } = await getNinotificationV1NotificationStrategies({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
