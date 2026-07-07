# OpenAPI Bug Reports

This document contains issue-ready bug reports for current upstream OpenAPI
defects found while generating this SDK. Some entries map directly to active
workarounds in `scripts/spec-patches.ts`; others are validated upstream issues
that do not currently require a local generation patch.

## Patch Coverage

| Local patch          | Service        | Covered bug reports  |
| -------------------- | -------------- | -------------------- |
| `patchRoutines`      | Routines       | `BUG-005`            |
| `patchTestMonitor`   | Test Monitor   | `BUG-010`            |

## Validated Upstream Resolutions

The following previously patched issues were rechecked against the latest specs
fetched on 2026-04-21 and are now resolved upstream:

- `BUG-001`: `GET /v1/service-groups/Default/files` no longer advertises the invalid `orderBy=lastUpdatedTimestamp` enum member.
- `BUG-002`: `POST /nialarm/v1/query-instances` now has `deprecated: true`.
- `BUG-003`: `POST /v1/service-groups/Default/query-files` now documents the `propertiesQuery` timeout risk upstream.
- `BUG-004`: the patched `/niworkorder/v1/testplans*`, `/workflows*`, and related template operations now generate `@deprecated` annotations from the raw upstream spec.
- `BUG-007`: `PATCH /niapm/v1/assets/{assetId}/metadata` now has `deprecated: true` upstream.
- `BUG-008`: `POST /nialarm/v1/query-instances` now points users to `POST /nialarm/v1/query-instances-with-filter` in the upstream description.

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

## BUG-010: Test Monitor `NamedValueObject.value` schema rejects primitive values accepted by the service

**Suggested issue title:** Test Monitor OpenAPI spec types `NamedValueObject.value` as object, but the service accepts primitive values

**Service:** Test Monitor (`/nitestmonitor`)
**Affected schema location:** `components.schemas.NamedValueObject.properties.value`
**Severity:** Medium
**Current local workaround:** `patchTestMonitor` rewrites `NamedValueObject.value` to an arbitrary JSON union during generation so the SDK accepts the values that the live service already supports.

### Problem

The current Test Monitor OpenAPI spec defines `NamedValueObject.value` as `type: object`.
The live service accepts primitive values for this field and returns them unchanged in
step payloads. That means generated SDKs currently reject valid requests at compile time.

The spec is also self-contradictory: the same schema publishes `example: 1.3` for a field
declared as `type: object`.

### Evidence

Current upstream spec snippet fetched from `https://dev-api.lifecyclesolutions.ni.com/nitestmonitor/swagger/v2/nitestmonitor-v2.yml` on 2026-07-07:

```yaml
NamedValueObject:
  title: Named Value
  description: Represents a named value or parameter
  type: object
  required:
    - name
  properties:
    name:
      description: The name of the value
      type: string
      example: Voltage
    value:
      description: The value
      type: object
      example: 1.3
```

Validated against the live service with the Test Monitor integration test suite:

```typescript
const createStep = await createStepsV2({
  client,
  body: {
    steps: [
      {
        resultId,
        name: 'primitive-input-step',
        stepType: 'NumericLimitTest',
        status: { statusType: 'PASSED' },
        inputs: [{ name: 'Voltage', value: 1.3 }],
      },
    ],
  },
});

// createStep.response.status === 201

const fetchedStep = await getStepV2({
  client,
  path: { resultId, stepId },
});

// fetchedStep.data.inputs?.[0]?.value === 1.3
```

### User impact

- Generated SDKs reject primitive values that the real service accepts.
- Consumers need unsafe casts or manual request construction to use valid payloads.
- The published schema is inconsistent with both its own example and live runtime behavior.

### Requested upstream change

- Change `NamedValueObject.value` to a schema that permits arbitrary JSON values, including primitives.
- If the service is intended to allow any JSON value, model that explicitly instead of `type: object`.
- Recheck other Test Monitor query/substitution schemas that currently use `type: object` with primitive examples, since they may reflect the same modeling issue.
- Regenerate downstream SDKs after the schema is corrected.

---

## Notes on Evidence Collection

These bugs were identified by comparing generated SDK output with live SystemLink
behavior, validating generated tests against a running instance, and cross-checking
service migration guidance against the published OpenAPI descriptions.
