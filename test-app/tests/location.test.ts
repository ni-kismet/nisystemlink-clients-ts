/**
 * Integration tests for the Location Service.
 *
 * Locations are hierarchical containers used by Asset Management.
 * CRUD lifecycle: create → fetch → updateMany → deleteMany.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNilocation,
  getNilocationV1Locations,
  postNilocationV1Locations,
  getNilocationV1LocationsByLocationId,
  postNilocationV1LocationsDeleteMany,
} from '../../src/generated/location';
import { createClient, createConfig } from '../../src/generated/location/client';

const configured = isConfigured();

describe.skipIf(!configured)('Location Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdLocationIds: string[] = [];

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdLocationIds.length > 0) {
      await postNilocationV1LocationsDeleteMany({
        client,
        body: { locationIds: createdLocationIds },
      }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNilocation({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('getNilocationV1Locations (list)', () => {
    it('lists locations', async () => {
      const { data, error, response } = await getNilocationV1Locations({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('location objects have expected shape when locations exist', async () => {
      const { data } = await getNilocationV1Locations({ client });
      const locations = (data as any)?.locations ?? (data as any)?.data ?? [];
      if (locations.length > 0) {
        const l = locations[0];
        expect(l).toHaveProperty('id');
        expect(l).toHaveProperty('name');
      }
    });
  });

  describe('Location CRUD', () => {
    it('creates a location', async () => {
      const { data, error, response } = await postNilocationV1Locations({
        client,
        body: { name: `ts-sdk-e2e-${Date.now()}` },
      });
      expect([200, 201], `Create location failed: ${JSON.stringify(error)}`).toContain(response.status);
      const id = (data as any)?.id;
      if (id) {
        createdLocationIds.push(id);
        expect(typeof id).toBe('string');
      }
    });

    it('fetches created location by id', async () => {
      if (createdLocationIds.length === 0) return;
      const id = createdLocationIds[0];

      const { data, error, response } = await getNilocationV1LocationsByLocationId({
        client,
        path: { locationId: id },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect((data as any)?.id).toBe(id);
    });
  });
});
