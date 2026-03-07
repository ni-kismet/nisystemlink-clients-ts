/**
 * Shared client configuration utilities for SystemLink TypeScript API clients.
 *
 * Each generated service has its own bundled fetch client.  Use the helpers
 * here to configure them consistently:
 *
 *   import { getClientConfig } from '../../src/client';
 *   import { createClient, createConfig } from './generated/alarm/client';
 *
 *   const client = createClient(createConfig(getClientConfig()));
 *
 * Authentication follows the same pattern as the slcli Python CLI:
 *   1. SYSTEMLINK_API_KEY environment variable
 *   2. SYSTEMLINK_API_URL environment variable (base URL)
 */

export interface SystemLinkClientOptions {
  /** Base URL of the SystemLink server, e.g. https://myserver.example.com */
  baseUrl: string;
  /** x-ni-api-key value used for API authentication */
  apiKey: string;
}

/** Read SystemLink connection settings from environment variables. */
export function getEnvConfig(): SystemLinkClientOptions {
  const baseUrl = process.env.SYSTEMLINK_API_URL;
  const apiKey = process.env.SYSTEMLINK_API_KEY;

  if (!baseUrl) {
    throw new Error(
      'SYSTEMLINK_API_URL environment variable is not set. ' +
      'Copy .env.example to .env and fill in your server URL.',
    );
  }
  if (!apiKey) {
    throw new Error(
      'SYSTEMLINK_API_KEY environment variable is not set. ' +
      'Copy .env.example to .env and fill in your API key.',
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

/**
 * Returns configuration for use with any generated service's createConfig().
 *
 * @example
 * import { createClient, createConfig } from './generated/alarm/client';
 * import { getClientConfig } from '../src/client';
 *
 * const client = createClient(createConfig(getClientConfig()));
 */
export function getClientConfig(): Record<string, unknown> {
  const { baseUrl, apiKey } = getEnvConfig();
  return {
    baseUrl,
    headers: {
      'x-ni-api-key': apiKey,
    },
  };
}

/** Check whether the environment is configured for integration tests. */
export function isConfigured(): boolean {
  return !!(process.env.SYSTEMLINK_API_URL && process.env.SYSTEMLINK_API_KEY);
}

/**
 * Builds the correct base URL for a generated service client.
 *
 * Some OpenAPI specs declare a `servers` section with a path prefix (e.g.
 * `https://dev-api.lifecyclesolutions.ni.com/nitestmonitor`), while others use
 * bare root paths and embed the service prefix in each operation URL.
 *
 * When running against a custom server, we must replace only the scheme+host
 * while keeping the spec's path prefix so the generated operation paths
 * (e.g. `/v2/query-results`) resolve to the right endpoint.
 *
 * Pass the `baseUrl` from the service's generated default client:
 * ```ts
 * import { client as svc } from './generated/test-monitor/client.gen';
 * const baseUrl = buildServiceBaseUrl(svc.getConfig().baseUrl ?? '');
 * ```
 */
export function buildServiceBaseUrl(specDefaultBaseUrl: string): string {
  const userApiUrl = process.env.SYSTEMLINK_API_URL;
  if (!userApiUrl) return specDefaultBaseUrl;

  try {
    const specUrl = new URL(specDefaultBaseUrl);
    const userUrl = new URL(userApiUrl);
    // Keep spec's path prefix but replace scheme+host with the user's server
    const path = specUrl.pathname === '/' ? '' : specUrl.pathname.replace(/\/$/, '');
    return `${userUrl.origin}${path}`;
  } catch {
    return userApiUrl;
  }
}
