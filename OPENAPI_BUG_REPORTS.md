# OpenAPI Bug Reports

This document contains issue-ready bug reports for current upstream OpenAPI
defects found while generating this SDK. Some entries map directly to active
workarounds in `scripts/spec-patches.ts`; others are validated upstream issues
that do not currently require a local generation patch.

## Patch Coverage

| Local patch          | Service        | Covered bug reports  |
| -------------------- | -------------- | -------------------- |
| `patchFileIngestion` | File Ingestion | `BUG-001`, `BUG-003` |
| `patchRoutines`      | Routines       | `BUG-005`            |

## Validated Upstream Resolutions

The following previously patched issues were rechecked against the latest specs
fetched on 2026-04-21 and are now resolved upstream:

- `BUG-002`: `POST /nialarm/v1/query-instances` now has `deprecated: true`.
- `BUG-004`: the patched `/niworkorder/v1/testplans*`, `/workflows*`, and related template operations now generate `@deprecated` annotations from the raw upstream spec.
- `BUG-007`: `PATCH /niapm/v1/assets/{assetId}/metadata` now has `deprecated: true` upstream.
- `BUG-008`: `POST /nialarm/v1/query-instances` now points users to `POST /nialarm/v1/query-instances-with-filter` in the upstream description.

---

## BUG-001: File Ingestion `orderBy` enum includes unsupported `lastUpdatedTimestamp`

**Suggested issue title:** File Ingestion OpenAPI spec lists unsupported `orderBy=lastUpdatedTimestamp`

**Service:** File Ingestion (`/nifile`)
**Affected operation:** `GET /v1/service-groups/Default/files`
**Affected field:** `orderBy` query parameter
**Severity:** Medium
**Current local workaround:** `patchFileIngestion` removes `lastUpdatedTimestamp` from the enum during generation.

### Problem

The OpenAPI spec advertises `lastUpdatedTimestamp` as a valid `orderBy` value for
`GET /v1/service-groups/Default/files`. The server rejects that value with HTTP 400,
so generated SDKs currently publish an option that does not work at runtime.

### Evidence

```typescript
const result = await listAvailableFilesGet({
  client,
  query: { orderBy: "lastUpdatedTimestamp" },
});

// result.response.status === 400
```

### User impact

- Generated clients and docs advertise an invalid enum member.
- Integrations can fail at runtime even when they stay within the published type surface.
- The mismatch makes the spec less trustworthy for code generation.

### Requested upstream change

- Remove `lastUpdatedTimestamp` from the `orderBy` enum for this operation.
- Confirm the remaining enum values match the server implementation.
- Regenerate downstream SDKs after the spec is corrected.

---

## BUG-003: File Ingestion `propertiesQuery` lacks a performance and timeout warning

**Suggested issue title:** Document timeout risk for `propertiesQuery` on `POST /v1/service-groups/Default/query-files`

**Service:** File Ingestion (`/nifile`)
**Affected operation:** `POST /v1/service-groups/Default/query-files`
**Affected field:** request body `propertiesQuery`
**Severity:** Medium
**Current local workaround:** `patchFileIngestion` appends a warning to the field description during generation.

### Problem

The `propertiesQuery` field can trigger expensive scans of custom file metadata.
On large datasets this is very likely to time out, but the OpenAPI schema does not
warn users about the behavior or point them at more scalable alternatives.

### User impact

- Consumers can choose an API pattern that is likely to fail on real datasets.
- Generated SDK docs omit a critical operational limitation.
- Support burden increases because the request looks valid in the schema.

### Requested upstream change

- Add a description warning that `propertiesQuery` may require non-indexed scans.
- Explicitly note that large collections may time out.
- Recommend `GET /v1/service-groups/Default/files` plus client-side filtering for simple cases.
- Recommend `POST /v1/service-groups/Default/query-files-linq` for indexed server-side filtering.

---

## BUG-005: Routines v1 operations are missing deprecation metadata

**Suggested issue title:** Mark all `/niroutine/v1` operations as deprecated in favor of `/niroutine/v2`

**Service:** Routines (`/niroutine`)
**Affected path family:** all `/niroutine/v1` operations
**Severity:** Low
**Current local workaround:** `patchRoutines` marks all v1 operations deprecated and adds a migration note during generation.

### Problem

Routines v2 is the general-purpose replacement for the legacy Routines v1 surface,
but the v1 operations are still published without `deprecated: true`.

### User impact

- Generated SDKs and docs present v1 as equally current.
- Consumers are not guided toward `/niroutine/v2`.
- New integrations can be built on the legacy API surface.

### Requested upstream change

- Add `deprecated: true` to every `/niroutine/v1` operation.
- Add migration text pointing to `/niroutine/v2` as the preferred replacement.
- Clarify that v1 is legacy and focused on scheduled notebook execution.

---

## BUG-009: Dataframe spec applies `minLength` to object-typed schema properties

**Suggested issue title:** Remove invalid `minLength` constraints from object properties in the Dataframe OpenAPI spec

**Service:** Dataframe (`/nidataframe`)
**Affected schema locations:**

- `components.schemas.ColumnMetadataPatch.properties.properties.minLength`
- `components.schemas.ModifyTableRequest.properties.properties.minLength`

**Severity:** Medium
**Current local workaround:** None. Generation succeeds, but the upstream spec fails linting.

### Problem

The dataframe spec applies `minLength: 1` to schema nodes whose `type` is `object`.
`minLength` is only valid for string schemas, so this produces error-severity lint
failures in OpenAPI validators such as `vacuum`.

### User impact

- The spec does not pass strict OpenAPI linting.
- Tooling that validates schema keywords by type reports hard errors.
- The remaining error-level findings in the SystemLink spec set are concentrated in this service.

### Evidence

The latest spec fetch still contains both invalid constraints:

```json
{
  "ColumnMetadataPatch.properties.properties": {
    "type": "object",
    "minLength": 1
  },
  "ModifyTableRequest.properties.properties": {
    "type": "object",
    "minLength": 1
  }
}
```

### Requested upstream change

- Remove `minLength` from both object-typed schema properties.
- If a non-empty object is required, express that constraint using an object-appropriate keyword or schema-level validation pattern.
- Re-run OpenAPI linting to confirm the dataframe spec is clean.

---

## Notes on Evidence Collection

These bugs were identified by comparing generated SDK output with live SystemLink
behavior, validating generated tests against a running instance, and cross-checking
service migration guidance against the published OpenAPI descriptions.
