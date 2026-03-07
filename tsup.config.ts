import { defineConfig } from 'tsup';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const generatedDir = resolve(import.meta.dirname, 'src/generated');
const services = readdirSync(generatedDir)
  .filter((name) => statSync(join(generatedDir, name)).isDirectory())
  .sort();

// One entry per service (SDK functions + types) and per service client factory,
// plus the shared environment-based config helper.
const entry: Record<string, string> = {
  client: './src/client.ts',
};

for (const service of services) {
  entry[service] = `./src/generated/${service}/index.ts`;
  entry[`${service}/client`] = `./src/generated/${service}/client/index.ts`;
}

export default defineConfig([
  {
    // ESM build — used by Angular (esbuild) and other modern bundlers
    entry,
    format: ['esm'],
    dts: {
      tsconfig: './tsconfig.build.json',
      resolve: true,
    },
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
    treeshake: true,
  },
  {
    // CJS build — for Node.js / older toolchains
    entry,
    format: ['cjs'],
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
  },
]);
