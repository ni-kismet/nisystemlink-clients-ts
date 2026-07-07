/**
 * Temporary in-flight patches applied to OpenAPI specs during code generation.
 * Each patch corrects a known bug in the upstream spec until NI fixes the source.
 *
 * Bug details are documented in OPENAPI_BUG_REPORTS.md.
 *
 * HOW TO REMOVE A PATCH
 * ---------------------
 * 1. Delete (or comment out) the entry from `specPatches` below.
 * 2. Run `npm run generate` to regenerate clean output.
 * 3. Verify the generated code is correct.
 * 4. Remove the corresponding entry from OPENAPI_BUG_REPORTS.md.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Spec = Record<string, any>;
type PatchFn = (spec: Spec) => Spec;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

/**
 * Map of service name → patch function.
 * Only services with known bugs need an entry here.
 */
export const specPatches: Partial<Record<string, PatchFn>> = {
  routines: patchRoutines,
  'test-monitor': patchTestMonitor,
};

// ---------------------------------------------------------------------------
// routines (v1)
// BUG-005: All /niroutine/v1/* operations — not marked deprecated.
//          Routines v2 (/niroutine/v2) is the general-purpose replacement.
// Remove when: spec marks all v1 operations as deprecated.
// ---------------------------------------------------------------------------
function patchRoutines(spec: Spec): Spec {
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!(path === '/niroutine/v1' || path.startsWith('/niroutine/v1/'))) continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Spec)?.[method];
      if (op && !op.deprecated) {
        op.deprecated = true;
        if (!String(op.description ?? '').includes('v2')) {
          op.description =
            `${op.description ?? ''}` +
            '\n\n**Deprecated:** Use the Routines v2 API (`/niroutine/v2`) instead.' +
            ' The v1 API only supports scheduled notebook execution and is considered legacy.';
        }
      }
    }
  }
  return spec;
}

// ---------------------------------------------------------------------------
// test-monitor
// BUG-010: NamedValueObject.value is typed as object in the spec, but the live
//          service accepts primitive JSON values and returns them unchanged.
// Remove when: spec models NamedValueObject.value as arbitrary JSON instead of
//              type: object.
// ---------------------------------------------------------------------------
function patchTestMonitor(spec: Spec): Spec {
  const valueSchema = spec.components?.schemas?.NamedValueObject?.properties?.value;
  if (!valueSchema) return spec;

  // Model the field as arbitrary JSON so generated SDKs accept the values
  // that the live service already supports.
  valueSchema.oneOf = [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'object', additionalProperties: true },
    { type: 'array', items: {} },
  ];
  delete valueSchema.type;

  return spec;
}
