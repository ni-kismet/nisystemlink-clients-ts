/**
 * Generates the `exports` map in package.json from the services present in
 * src/generated/. Run this after adding or removing a generated service:
 *
 *   npx tsx scripts/generate-exports.ts
 *
 * The build script calls this automatically via the `prebuild` hook.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedDir = join(ROOT, 'src/generated');
const pkgPath = join(ROOT, 'package.json');

const services = readdirSync(generatedDir)
  .filter((name) => statSync(join(generatedDir, name)).isDirectory())
  .sort();

// Build the exports map consumed by Node.js module resolution, Angular's
// esbuild, webpack, and other bundlers that honour the "exports" field.
const exports: Record<string, unknown> = {
  './client': {
    types: './dist/client.d.ts',
    import: './dist/client.js',
    require: './dist/client.cjs',
  },
};

for (const service of services) {
  exports[`./${service}`] = {
    types: `./dist/${service}.d.ts`,
    import: `./dist/${service}.js`,
    require: `./dist/${service}.cjs`,
  };
  exports[`./${service}/client`] = {
    types: `./dist/${service}/client.d.ts`,
    import: `./dist/${service}/client.js`,
    require: `./dist/${service}/client.cjs`,
  };
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
pkg.exports = exports;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✓ package.json updated with ${Object.keys(exports).length} export entries (${services.length} services)`);
