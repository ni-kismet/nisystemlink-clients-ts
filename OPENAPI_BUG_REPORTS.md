# OpenAPI Bug Reports

This document tracks bugs discovered in the NI SystemLink OpenAPI specifications
during development of the TypeScript SDK test suite. Each issue should be filed
against the relevant OpenAPI YAML source file in the NI API documentation repository.

---

## BUG-001: `listAvailableFilesGet` — `orderBy: 'lastUpdatedTimestamp'` causes HTTP 400

**Service:** File Ingestion (`/nifile`)
**Endpoint:** `GET /v1/service-groups/Default/files`
**Parameter:** `orderBy` query parameter
**Severity:** Medium

### Description

The OpenAPI spec for `listAvailableFilesGet` declares `'lastUpdatedTimestamp'` as a valid
value for the `orderBy` query parameter. However, when this value is sent to the server,
the server returns HTTP 400 (Bad Request).

### Steps to Reproduce

```typescript
const result = await listAvailableFilesGet({
  client,
  query: { orderBy: "lastUpdatedTimestamp" },
});
// result.response.status === 400
```

### Fix

Remove `'lastUpdatedTimestamp'` from the `orderBy` enum in the OpenAPI spec.
Valid values appear to be: `'lastModifiedTimestamp'`, `'id'`, `'name'`, `'size'`, `'contentType'`, `'created'`.

### Code Fix Applied

Removed `'lastUpdatedTimestamp'` from the `orderBy` union type in
`src/generated/file-ingestion/types.gen.ts`.

---

## BUG-002: `postNialarmV1QueryInstances` — not marked as deprecated in OpenAPI spec

**Service:** Alarm (`/nialarm`)
**Endpoint:** `POST /nialarm/v1/query-alarm-instances`
**Severity:** Low

### Description

The alarm service v4 introduced `postNialarmV1QueryInstancesWithFilter` as the
replacement for `postNialarmV1QueryInstances`. The original endpoint is considered
deprecated but is **not** marked with `deprecated: true` in the OpenAPI spec.

As a result:

- The generated TypeScript client has no `@deprecated` JSDoc annotation on `postNialarmV1QueryInstances`
- Consumers have no IDE warning when using the old endpoint
- The new endpoint supports additional filter options that the old endpoint does not

### Fix

Add `deprecated: true` to the OpenAPI spec entry for `POST /nialarm/v1/query-alarm-instances`.

---

## BUG-003: `queryAvailableFiles` — `propertiesQuery` can cause server-side timeout

**Service:** File Ingestion (`/nifile`)
**Endpoint:** `POST /nifile/v1/query-available-files`
**Parameter:** `propertiesQuery` request body field
**Severity:** Medium

### Description

The `propertiesQuery` field in the `QueryAvailableFilesRequest` schema allows callers
to filter by custom file metadata properties. When used with complex expressions or
when targeting metadata fields that are not indexed, the server performs a full scan
and may time out without returning a response.

The OpenAPI spec does not document:

1. That `propertiesQuery` targets non-indexed metadata (making it slow for large datasets)
2. The risk of server-side timeout
3. Any recommendation to use `queryFilesLinq` (which uses indexed columns) instead

### Fix

Add a `description` note to the `propertiesQuery` field in the OpenAPI spec warning that:

- This field performs non-indexed metadata filtering
- For large file collections, prefer `queryFilesLinq` with indexed `filter` expressions
- Complex `propertiesQuery` expressions may cause request timeouts

### Code Fix Applied

Added `@remarks` JSDoc to `propertiesQuery` in `src/generated/file-ingestion/types.gen.ts`.

---

## BUG-004: Work Order testplan endpoints — not marked deprecated in generated types

**Service:** Work Order (`/niworkorder`)
**Endpoints:** All `/niworkorder/v1/testplans*` and `/niworkorder/v1/workflows*` endpoints
**Severity:** Low

### Description

The NI Platform documentation states that the work-order testplan/workflow endpoints
are deprecated in favour of the work-item service (`/niworkitem`). However, the
OpenAPI spec does not have `deprecated: true` on these operations, so the generated
TypeScript client gives no deprecation warning to consumers.

### Deprecated endpoints (partial list)

- `POST /niworkorder/v1/testplans`
- `POST /niworkorder/v1/query-testplans`
- `GET /niworkorder/v1/testplans-summary`
- `GET /niworkorder/v1/testplans/{testPlanId}`
- `POST /niworkorder/v1/delete-testplans`
- `POST /niworkorder/v1/update-testplans`
- `POST /niworkorder/v1/schedule-testplans`
- `POST /niworkorder/v1/testplans/{testPlanId}/execute`
- `POST /niworkorder/v1/testplan-templates`
- `POST /niworkorder/v1/query-testplan-templates`
- `POST /niworkorder/v1/delete-testplan-templates`
- `POST /niworkorder/v1/update-testplan-templates`
- `POST /niworkorder/v1/workflows`
- `POST /niworkorder/v1/query-workflows`
- etc.

### Fix

Add `deprecated: true` to each affected path operation in the work-order OpenAPI spec.
Consider also adding an `x-ni-migration` extension pointing to the work-item equivalents.

---

## BUG-005: Routines v1 (`/niroutine/v1`) — not marked deprecated

**Service:** Routines v1 (`/niroutine/v1`)
**Severity:** Low

### Description

The Routines v2 API (`/niroutine/v2`) was introduced as a general-purpose replacement
for Routines v1, which only supports scheduled notebook execution. The v1 API is
considered legacy but is **not** marked `deprecated: true` in the spec, so the
generated client has no `@deprecated` indicator on v1 functions.

### Fix

Add `deprecated: true` to all `/niroutine/v1` path operations in the OpenAPI spec
and include a migration note pointing to `/niroutine/v2`.

---

## BUG-006: Dynamic form fields — `formType: 'workorder:testplan'` should map to `workitem:workitem`

**Service:** Dynamic Form Fields (`/nidynamicformfields`)
**Field:** `formType` parameter in various configuration endpoints
**Severity:** Low

### Description

The `formType` value `'workorder:testplan'` was the original identifier for test plan
configuration. After the work-order → work-item migration, the canonical form type
became `'workitem:workitem'`. The OpenAPI spec may still list `'workorder:testplan'`
as a valid/primary value without noting the migration to `'workitem:workitem'`.

### Fix

In the spec for dynamic form fields endpoints, update the `formType` documentation to:

- Mark `'workorder:testplan'` as deprecated
- Recommend `'workitem:workitem'` for new integrations
- Add a mapping table for all migrated form types

---

## BUG-007: Asset Management — `patchNiapmV1AssetsByAssetIdMetadata` not marked deprecated

**Service:** Asset Management (`/niapm`)
**Endpoint:** `PATCH /niapm/v1/assets/{assetId}/metadata`
**Severity:** Low

### Description

`postNiapmV1UpdateAssets` (POST batch update) supersedes `patchNiapmV1AssetsByAssetIdMetadata`
(PATCH single-asset metadata update) for performance and consistency with other NI batch
update patterns. The PATCH endpoint is not marked `deprecated: true` in the spec.

### Fix

Add `deprecated: true` and a migration note pointing to `postNiapmV1UpdateAssets`.

---

## BUG-008: Alarm `postNialarmV1QueryInstances` — missing `filter` field not apparent from spec diff

**Service:** Alarm
**Severity:** Minor / Documentation

### Description

`postNialarmV1QueryInstancesWithFilter` adds a `filter` request body field (Dynamic LINQ)
that enables server-side filtering. The original `postNialarmV1QueryInstances` lacks this
field entirely. The spec does not include inline comparison documentation or a `see` reference
showing the enhanced replacement, making it harder for developers to discover the preferred endpoint.

### Fix

Add a `description` or `externalDocs` link on `postNialarmV1QueryInstances` pointing to
`postNialarmV1QueryInstancesWithFilter`.

---

## Notes on Test Methodology

The bugs above were discovered by:

1. Comparing generated TypeScript types to actual server responses (HTTP 400 for invalid `orderBy`)
2. Comparing endpoint naming patterns across services (deprecated vs. preferred)
3. Running the integration test suite against a live SystemLink instance
4. Cross-referencing NI platform migration documentation

Additional bugs may be discovered when running the integration test suite against a live
SystemLink instance using the new test files in `test-app/tests/`.
