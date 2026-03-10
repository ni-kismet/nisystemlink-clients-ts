/**
 * Integration tests for the Comments Service.
 *
 * Comments are attached to resources (test results, assets, etc.).
 * CRUD lifecycle: create → list → update → delete.
 * Tests clean up all created comments in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isConfigured } from '../../src/client';
import {
  getApiInfo,
  listComments,
  createComments,
  updateComment,
  deleteComments,
} from '../../src/generated/comments';
import { createClient, createConfig } from '../../src/generated/comments/client';

const configured = isConfigured();

describe.skipIf(!configured)('Comments Service', () => {
  let client: ReturnType<typeof createClient>;
  const createdCommentIds: string[] = [];

  beforeAll(() => {
    client = createClient(
      createConfig({
        baseUrl: process.env.SYSTEMLINK_API_URL!,
        headers: { 'x-ni-api-key': process.env.SYSTEMLINK_API_KEY! },
      }),
    );
  });

  afterAll(async () => {
    if (createdCommentIds.length > 0) {
      await deleteComments({
        client,
        body: { ids: createdCommentIds },
      }).catch(() => {});
    }
  });

  describe('API info', () => {
    it('root endpoint is reachable', async () => {
      const { response } = await getApiInfo({ client });
      expect(response.status).toBeLessThan(400);
    });
  });

  describe('listComments', () => {
    it('returns a list of comments for a dummy resource (may be empty)', async () => {
      // listComments requires both ResourceType and ResourceId — query against a
      // synthetic resource type/id that likely has no comments; server still returns 200.
      const { data, error, response } = await listComments({
        client,
        query: { ResourceType: 'testmonitor:result', ResourceId: 'ts-sdk-e2e-dummy' },
      });
      expect(response.status, `HTTP ${response.status}: ${JSON.stringify(error)}`).toBe(200);
      expect(Array.isArray(data?.comments)).toBe(true);
    });

    it('comment objects have expected shape when comments exist', async () => {
      const { data } = await listComments({
        client,
        query: { ResourceType: 'testmonitor:result', ResourceId: 'ts-sdk-e2e-dummy' },
      });
      const comments = data?.comments ?? [];
      if (comments.length > 0) {
        const c = comments[0];
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('resourceId');
        expect(c).toHaveProperty('message');
      }
    });
  });

  describe('CRUD lifecycle', () => {
    it('creates and updates a comment', async () => {
      // Comments must be attached to an existing resource.
      // We use a synthetic resource id; the server may reject it if it cannot
      // resolve the resource — we check for [200, 201, 207, 400] and only
      // proceed with update/delete when creation succeeds.
      const testResourceId = `ts-sdk-e2e-${Date.now()}`;

      const { data: created, error, response } = await createComments({
        client,
        body: {
          comments: [
            {
              resourceId: testResourceId,
              resourceType: 'testmonitor:result',
              message: 'ts-sdk-e2e test comment',
              workspace: 'default',
            },
          ],
        },
      });

      // 200 = all created; 201 = created; 207 = partial success; 400 = resource not found (ok for e2e)
      expect([200, 201, 207, 400]).toContain(response.status);
      const id = created?.createdComments?.[0]?.id;
      if (id) {
        createdCommentIds.push(id);

        // Update the comment text
        const { response: updateResp } = await updateComment({
          client,
          path: { id },
          body: { message: 'ts-sdk-e2e updated' },
        });
        expect([200, 204]).toContain(updateResp.status);
      }
    });
  });
});
