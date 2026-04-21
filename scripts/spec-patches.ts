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
  'file-ingestion': patchFileIngestion,
  routines: patchRoutines,
};

// ---------------------------------------------------------------------------
// file-ingestion
// BUG-001: GET /v1/service-groups/Default/files — orderBy enum includes
//          'lastUpdatedTimestamp', which the server rejects with HTTP 400.
//          Valid values are: 'created', 'id', 'size'.
// Remove when: spec removes 'lastUpdatedTimestamp' from the orderBy enum.
//
// BUG-003: POST /v1/service-groups/Default/query-files — propertiesQuery field
//          lacks a warning that it performs non-indexed scans and can time out.
// Remove when: spec adds appropriate description/warning to the propertiesQuery field.
// ---------------------------------------------------------------------------
function patchFileIngestion(spec: Spec): Spec {
  // BUG-001: drop the invalid enum member from the GET files orderBy parameter.
  const getFilesOp = spec.paths?.['/v1/service-groups/Default/files']?.get;
  if (getFilesOp?.parameters) {
    const orderByParam = getFilesOp.parameters.find((p: Spec) => p.name === 'orderBy');
    if (orderByParam?.enum) {
      orderByParam.enum = (orderByParam.enum as string[]).filter(
        (v) => v !== 'lastUpdatedTimestamp',
      );
    }
  }

  // BUG-003: add a timeout warning to the propertiesQuery field in the request schema.
  const timeoutWarning =
    'Warning: queries on custom (un-indexed) properties are very likely to time out ' +
    'on the server for large file collections. For large datasets, prefer listing files ' +
    'with `GET /v1/service-groups/Default/files` and filtering client-side, or use ' +
    '`POST /v1/service-groups/Default/query-files-linq` with indexed filter expressions.';
  const queryFilesOp = spec.paths?.['/v1/service-groups/Default/query-files']?.post;
  const requestBodySchema = queryFilesOp?.requestBody?.content?.['application/json']?.schema;
  const requestBodyParam = queryFilesOp?.parameters?.find((p: Spec) => p.in === 'body' && p.name === 'query');
  const propertiesQueryField =
    requestBodySchema?.properties?.propertiesQuery ?? requestBodyParam?.schema?.properties?.propertiesQuery;
  if (propertiesQueryField && !String(propertiesQueryField.description ?? '').includes('time out')) {
    propertiesQueryField.description = propertiesQueryField.description
      ? `${propertiesQueryField.description} ${timeoutWarning}`
      : timeoutWarning;
  }

  return spec;
}

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
