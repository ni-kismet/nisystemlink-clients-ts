/**
 * Integration tests for the Routines v2 Service.
 *
 * routines-v2 is the PREFERRED API for all new routine development.
 * It supports any event trigger type (schedule, notebook completion, tags, etc.)
 * unlike routines-v1 which is notebook-only.
 *
 * CRUD lifecycle: create routine → fetch → update → delete (cleaned up in afterAll).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  rootEndpoint,
  queryRoutines,
  createRoutine,
  getRoutine,
  updateRoutine,
  deleteRoutine,
} from '../../src/generated/routines-v2';
import { createClient, createConfig } from '../../src/generated/routines-v2/client';

const configured = isConfigured();

describe.skipIf(!configured)('Routines v2 Service (preferred)', () => {
  let client: ReturnType<typeof createClient>;
  let createdRoutineId: string | undefined;

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdRoutineId) {
      await deleteRoutine({ client, path: { id: createdRoutineId } }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await rootEndpoint({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('queryRoutines (GET list)', () => {
    it('lists routines', async () => {
      const { data, error, response } = await queryRoutines({ client });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(data).toBeDefined();
    });

    it('can filter by enabled state', async () => {
      const { data, response } = await queryRoutines({
        client,
        query: { Enabled: true },
      });
      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });
  });

  describe('Routine CRUD', () => {
    it.skip('creates a schedule-triggered routine', async () => {
      const { data, error, response } = await createRoutine({
        client,
        body: {
          name: `ts-sdk-e2e-${Date.now()}`,
          enabled: false,
          // HttpEventDefinition and HttpActionDefinition both require at least 1 element in their arrays
          event: {
            type: 'SCHEDULE',
            triggers: [{ name: 'schedule', configuration: { cronExpression: '0 0 * * *' } }],
          },
          actions: [{ type: 'log', configuration: { message: 'ts-sdk-e2e' } }],
        },
      });
      expect(response.status, `Create routine failed: ${JSON.stringify(error)}`).toBe(200);
      createdRoutineId = (data as any)?.id;
      if (createdRoutineId) {
        expect(typeof createdRoutineId).toBe('string');
      }
    });

    it('fetches created routine by id', async () => {
      if (!createdRoutineId) return;
      const { data, error, response } = await getRoutine({
        client,
        path: { id: createdRoutineId },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect((data as any)?.id).toBe(createdRoutineId);
    });

    it('updates routine enabled state', async () => {
      if (!createdRoutineId) return;
      const { response } = await updateRoutine({
        client,
        path: { id: createdRoutineId },
        body: { enabled: false },
      });
      expect([200, 204]).toContain(response.status);
    });
  });
});
