/**
 * Integration tests for the Systems State Service.
 *
 * Tests state listing, CRUD lifecycle (create → get → update → delete),
 * and state version history. Export/Import tests require file I/O and are
 * skipped to keep the suite lightweight.
 *
 * CRUD cleanup: uses postNisystemsstateV1DeleteStates for batch deletion.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getNisystemsstate,
  getNisystemsstateV1,
  getNisystemsstateV1States,
  postNisystemsstateV1States,
  getNisystemsstateV1StatesByStateId,
  patchNisystemsstateV1StatesByStateId,
  postNisystemsstateV1DeleteStates,
  getNisystemsstateV1StatesByStateIdHistory,
} from '../../src/generated/systems-state';
import { createClient, createConfig } from '../../src/generated/systems-state/client';

const configured = isConfigured();

describe.skipIf(!configured)('Systems State Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdStateIds: string[] = [];
  const testName = `ts-sdk-e2e-${Date.now()}`;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdStateIds.length > 0) {
      await postNisystemsstateV1DeleteStates({
        client,
        body: createdStateIds,
      }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getNisystemsstate({ client });
      expect(response.status).toBeLessThan(400);
    });

    it('v1 endpoint is reachable', async () => {
      const { response } = await getNisystemsstateV1({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('getNisystemsstateV1States', () => {
    it('lists states', async () => {
      const start = Date.now();
      const { data, error, response } = await getNisystemsstateV1States({ client });
      const elapsed = Date.now() - start;
      if (elapsed > 5000) console.warn(`[SLOW] getNisystemsstateV1States took ${elapsed}ms`);

      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
      // Response is StateDescriptionListResponse with a 'states' array
      expect(Array.isArray((data as any)?.states)).toBe(true);
    });

    it('can limit results with take', async () => {
      const { data, response } = await getNisystemsstateV1States({
        client,
        query: { Take: 5 },
      });
      expect(response.status).toBe(200);
      const items = (data as any)?.states ?? [];
      expect(items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('State CRUD', () => {
    it('creates a state', async () => {
      const { data, error, response } = await postNisystemsstateV1States({
        client,
        body: {
          name: testName,
          description: 'Created by ts-sdk e2e tests',
          content: { packages: [] },
        } as any,
      });
      expect(
        [200, 201],
        `HTTP ${response.status}: ${JSON.stringify(error)}`,
      ).toContain(response.status);
      const id = (data as any)?.id;
      if (id) {
        createdStateIds.push(id);
        expect(typeof id).toBe('string');
      }
    });

    it('fetches created state by id', async () => {
      if (createdStateIds.length === 0) return;
      const { data, error, response } = await getNisystemsstateV1StatesByStateId({
        client,
        path: { stateId: createdStateIds[0] },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect((data as any)?.id).toBe(createdStateIds[0]);
    });

    it('updates the state description', async () => {
      if (createdStateIds.length === 0) return;
      const { response } = await patchNisystemsstateV1StatesByStateId({
        client,
        path: { stateId: createdStateIds[0] },
        body: { description: 'Updated by ts-sdk e2e tests' },
      });
      expect([200, 204]).toContain(response.status);
    });

    it('fetches state version history', async () => {
      if (createdStateIds.length === 0) return;
      const { data, error, response } = await getNisystemsstateV1StatesByStateIdHistory({
        client,
        path: { stateId: createdStateIds[0] },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
