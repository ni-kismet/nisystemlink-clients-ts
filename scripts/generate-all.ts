/**
 * Generates TypeScript API clients for all SystemLink services listed in
 * docs/swaggerUrls.yml. Specs are pulled from dev-api.lifecyclesolutions.ni.com
 * and the code is written to src/generated/{service-name}/.
 *
 * Usage:
 *   npm run generate
 *
 * Generated plugins (per service):
 *   @hey-api/typescript — TypeScript types (types.gen.ts)
 *   @hey-api/sdk        — Strongly-typed SDK functions (sdk.gen.ts)
 *   @hey-api/client-fetch — Bundled Fetch API client (client/)
 */

import { createClient as generate } from '@hey-api/openapi-ts';
import yaml from 'js-yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { specPatches } from './spec-patches.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE_SPEC_URL = 'https://dev-api.lifecyclesolutions.ni.com';
const OUTPUT_BASE = resolve(ROOT, 'src', 'generated');

/** All SystemLink services with their OpenAPI spec paths and output directory names. */
const SERVICES = [
  { name: 'alarm',                    spec: '/nialarm/swagger/v1/nialarm.json' },
  { name: 'asset-management',         spec: '/niapm/swagger/v1/niapm.json' },
  { name: 'auth',                     spec: '/niauth/swagger/v1/niauth.yaml' },
  { name: 'comments',                 spec: '/nicomments/swagger/v1/nicomments.json' },
  { name: 'dataframe',                spec: '/nidataframe/swagger/v1/nidataframe.json' },
  { name: 'dynamic-form-fields',      spec: '/nidynamicformfields/swagger/v1/nidynamicformfields.json' },
  { name: 'feeds',                    spec: '/nifeed/swagger/v1/nifeed.json' },
  { name: 'file-ingestion',           spec: '/nifile/swagger/v1/nifile.yaml' },
  { name: 'location',                 spec: '/nilocation/swagger/v1/nilocation.json' },
  { name: 'notebook-execution',       spec: '/ninbexecution/swagger/v1-ninbexecution.json' },
  { name: 'notebook-execution-artifact', spec: '/ninbexecution/swagger/v1-ninbartifact.json' },
  { name: 'notebook',                 spec: '/ninotebook/swagger/v1/ninotebook.yaml' },
  { name: 'notification',             spec: '/ninotification/swagger/v1/ninotification.json' },
  { name: 'repository',               spec: '/nirepo/swagger/v1/nirepo.json' },
  { name: 'routines',                 spec: '/niroutine/swagger/v1/niroutinemanager.json' },
  { name: 'routines-v2',              spec: '/niroutine/v2/swagger/v1/niroutine.json' },
  { name: 'specification-management', spec: '/nispec/swagger/v1/nispec.json' },
  { name: 'systems-management',       spec: '/nisysmgmt/swagger/v1/nisysmgmt.json' },
  { name: 'systems-state',            spec: '/nisystemsstate/swagger/v1/nisystemsstate.json' },
  { name: 'tag-historian',            spec: '/nitaghistorian/swagger/v2/nitaghistorian.yaml' },
  { name: 'tags',                     spec: '/nitag/swagger/v2/nitag.yaml' },
  { name: 'test-monitor',             spec: '/nitestmonitor/swagger/v2/nitestmonitor-v2.yml' },
  { name: 'user-data',                spec: '/niuserdata/swagger/v1/niuserdata.json' },
  { name: 'user',                     spec: '/niuser/swagger/v1/niuser.yaml' },
  { name: 'web-application',          spec: '/niapp/swagger/v1/niapp.yaml' },
  { name: 'work-item',                spec: '/niworkitem/swagger/v1/niworkitem.json' },
  { name: 'work-order',               spec: '/niworkorder/swagger/v1/niworkorder.json' },
] as const;

type Spec = Record<string, unknown>;

function withSourceBaseUrl(spec: Spec, sourceUrl: string): Spec {
  const url = new URL(sourceUrl);

  if (typeof spec.openapi === 'string') {
    const openApiSpec = spec as Spec & { servers?: Array<{ url: string }> };
    if (!openApiSpec.servers || openApiSpec.servers.length === 0) {
      openApiSpec.servers = [{ url: url.origin }];
    }
    return openApiSpec;
  }

  if (typeof spec.swagger === 'string') {
    const swaggerSpec = spec as Spec & { host?: string; schemes?: string[] };
    if (!swaggerSpec.host) {
      swaggerSpec.host = url.host;
    }
    if (!swaggerSpec.schemes || swaggerSpec.schemes.length === 0) {
      swaggerSpec.schemes = [url.protocol.replace(':', '')];
    }
  }

  return spec;
}

/**
 * Fetches an OpenAPI spec URL and returns the parsed object.
 * Handles both JSON and YAML formats based on the URL file extension.
 */
async function fetchSpec(url: string): Promise<Spec> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching spec: ${url}`);
  const text = await res.text();
  const isYaml = /\.ya?ml$/i.test(url);
  return withSourceBaseUrl((isYaml ? yaml.load(text) : JSON.parse(text)) as Spec, url);
}

/** Plugins to include in every generated client. */
const PLUGINS = [
  '@hey-api/typescript',
  '@hey-api/sdk',
  '@hey-api/client-fetch',
] as const;

async function main(): Promise<void> {
  console.log(`\nGenerating TypeScript clients for ${SERVICES.length} SystemLink services\n`);

  const failed: string[] = [];
  let succeeded = 0;

  for (const service of SERVICES) {
    const inputUrl = `${BASE_SPEC_URL}${service.spec}`;
    const outputPath = resolve(OUTPUT_BASE, service.name);

    process.stdout.write(`  [${String(SERVICES.indexOf(service) + 1).padStart(2)}/${SERVICES.length}] ${service.name} ... `);

    try {
      const patchFn = specPatches[service.name];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let specInput: any = inputUrl;
      if (patchFn) {
        const rawSpec = await fetchSpec(inputUrl);
        specInput = patchFn(rawSpec);
      }

      await generate({
        input: specInput,
        output: { path: outputPath },
        plugins: [...PLUGINS],
      });
      process.stdout.write('✓\n');
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stdout.write(`✗  ${message}\n`);
      failed.push(service.name);
    }
  }

  console.log(`\nResults: ${succeeded} succeeded, ${failed.length} failed`);

  if (failed.length > 0) {
    console.error('\nFailed services:');
    for (const name of failed) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }

  console.log('\nDone! Generated clients are in src/generated/');
  console.log('Run "npm run typecheck" to validate the output.\n');
}

main().catch((err) => {
  console.error('\nFatal error during generation:', err);
  process.exit(1);
});
