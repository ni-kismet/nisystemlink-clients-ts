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
  alarm: patchAlarm,
  'asset-management': patchAssetManagement,
  'file-ingestion': patchFileIngestion,
  routines: patchRoutines,
  'work-order': patchWorkOrder,
};

// ---------------------------------------------------------------------------
// alarm
// BUG-002: postNialarmV1QueryInstances — not marked deprecated in the spec.
// BUG-008: No cross-reference to the replacement endpoint in the description.
// Remove when: spec marks POST /nialarm/v1/query-instances as deprecated and
//              adds a description pointing to query-instances-with-filter.
// ---------------------------------------------------------------------------
function patchAlarm(spec: Spec): Spec {
  const op = spec.paths?.['/nialarm/v1/query-instances']?.post;
  if (op) {
    op.deprecated = true;
    if (!String(op.description ?? '').includes('query-instances-with-filter')) {
      op.description =
        `${op.description ?? ''}` +
        '\n\n**Deprecated:** Use `POST /nialarm/v1/query-instances-with-filter` instead.' +
        ' That endpoint supports Dynamic LINQ `filter` expressions and supersedes this one.';
    }
  }
  return spec;
}

// ---------------------------------------------------------------------------
// asset-management
// BUG-007: PATCH /niapm/v1/assets/{assetId}/metadata — not marked deprecated.
//          The batch update endpoint (POST /niapm/v1/update-assets) supersedes it.
// Remove when: spec marks the PATCH operation as deprecated.
// ---------------------------------------------------------------------------
function patchAssetManagement(spec: Spec): Spec {
  const op = spec.paths?.['/niapm/v1/assets/{assetId}/metadata']?.patch;
  if (op) {
    op.deprecated = true;
    if (!String(op.description ?? '').includes('update-assets')) {
      op.description =
        `${op.description ?? ''}` +
        '\n\n**Deprecated:** Use `POST /niapm/v1/update-assets` for batch asset updates instead.';
    }
  }
  return spec;
}

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
  const requestBodyParam = queryFilesOp?.parameters?.find((p: Spec) => p.in === 'body' && p.name === 'query');
  const propertiesQueryField = requestBodyParam?.schema?.properties?.propertiesQuery;
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

// ---------------------------------------------------------------------------
// work-order (testplans + workflows)
// BUG-004: /niworkorder/v1/testplans* and /niworkorder/v1/workflows* operations
//          are not marked deprecated despite being superseded by /niworkitem.
// Remove when: spec marks these operations as deprecated.
// ---------------------------------------------------------------------------
function patchWorkOrder(spec: Spec): Spec {
  const deprecatedPrefixes = [
    '/niworkorder/v1/testplans',
    '/niworkorder/v1/workflows',
    '/niworkorder/v1/testplan-templates',
    '/niworkorder/v1/query-testplan-templates',
    '/niworkorder/v1/delete-testplan-templates',
    '/niworkorder/v1/update-testplan-templates',
  ];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!deprecatedPrefixes.some((prefix) => path.startsWith(prefix))) continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Spec)?.[method];
      if (op && !op.deprecated) {
        op.deprecated = true;
        if (!String(op.description ?? '').includes('niworkitem')) {
          op.description =
            `${op.description ?? ''}` +
            '\n\n**Deprecated:** Use the equivalent `/niworkitem` endpoint instead.' +
            ' The work-item service supersedes the work-order testplan/workflow endpoints.';
        }
      }
    }
  }
  return spec;
}
