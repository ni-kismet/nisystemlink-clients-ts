# OpenAPI Specification Status

> Generated on 2026-04-21 using [vacuum v0.25.9](https://quobix.com/vacuum/) against specs
> fetched from `https://dev-api.lifecyclesolutions.ni.com`. Only **errors** are reported;
> warnings and informational findings are omitted.

## Overview

| Service                     | Spec Format          | Version | Errors | Status                        |
| --------------------------- | -------------------- | ------- | -----: | ----------------------------- |
| alarm                       | OpenAPI 3.0.4 (JSON) | v1      |      0 | **Clean**                     |
| asset-management            | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| auth                        | OpenAPI 3.0.0 (YAML) | 1.0     |      0 | **Clean**                     |
| comments                    | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| dataframe                   | OpenAPI 3.0.4 (JSON) | 1       |      2 | Invalid `minLength` on object |
| dynamic-form-fields         | OpenAPI 3.0.4 (JSON) | v1alpha |      0 | **Clean**                     |
| feeds                       | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| file-ingestion              | OpenAPI 3.0.0 (YAML) | 1       |      0 | **Clean**                     |
| location                    | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| notebook                    | OpenAPI 3.0.1 (YAML) | 1.0     |      0 | **Clean**                     |
| notebook-execution          | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| notebook-execution-artifact | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| notification                | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| repository                  | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| routines                    | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| routines-v2                 | OpenAPI 3.0.4 (JSON) | 2       |      0 | **Clean**                     |
| specification-management    | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| systems-management          | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| systems-state               | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| tag-historian               | OpenAPI 3.0.0 (YAML) | 1       |      0 | **Clean**                     |
| tags                        | OpenAPI 3.0.0 (YAML) | 2       |      0 | **Clean**                     |
| test-monitor                | OpenAPI 3.0.0 (YAML) | 2       |      0 | **Clean**                     |
| user                        | OpenAPI 3.0.0 (YAML) | 1.0     |      0 | **Clean**                     |
| user-data                   | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| web-application             | OpenAPI 3.0.0 (YAML) | 1.0     |      0 | **Clean**                     |
| work-item                   | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |
| work-order                  | OpenAPI 3.0.4 (JSON) | 1       |      0 | **Clean**                     |

**Totals:** 27 specs — 26 clean, 1 with errors (2 total errors)

---

## Format Distribution

| Format               | Count | Services                                                                                                                                                                                                                                                                            |
| -------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI 3.0.4 (JSON) |    19 | alarm, asset-management, comments, dataframe, dynamic-form-fields, feeds, location, notebook-execution, notebook-execution-artifact, notification, repository, routines, routines-v2, specification-management, systems-management, systems-state, user-data, work-item, work-order |
| OpenAPI 3.0.0 (YAML) |     7 | auth, file-ingestion, tag-historian, tags, test-monitor, user, web-application                                                                                                                                                                                                      |
| OpenAPI 3.0.1 (YAML) |     1 | notebook                                                                                                                                                                                                                                                                            |

---

## Error Categories

### 1. Invalid `minLength` on non-string type (1 spec · 2 errors)

The `minLength` constraint is applied to a schema of type `object`, but it is
only valid on `string` schemas.

**Affected spec:** dataframe.

Current locations:

- `components.schemas.ColumnMetadataPatch.properties.properties.minLength`
- `components.schemas.ModifyTableRequest.properties.properties.minLength`

---

## Clean Specs

All specs except **dataframe** pass vacuum linting with zero errors.

---

## Notes

- **`operationId` coverage is now complete.** All 420 operations across the 27 fetched specs include an `operationId`, eliminating the largest source of generated SDK naming instability from the March snapshot.
- **Legacy Swagger 2.0 specs have been upgraded upstream.** The services previously published as Swagger 2.0 now serve OpenAPI 3.0.0 documents, which removed the earlier integer response-key and undefined `securityDefinition` errors.
- **The remaining blocking issue is isolated.** Only the dataframe spec still produces error-severity findings, both caused by invalid `minLength` constraints on object-typed schema properties.
- **Several semantic spec bugs were fixed upstream in the latest fetch.** Alarm now marks `POST /nialarm/v1/query-instances` deprecated and points to `query-instances-with-filter`; work-order legacy testplan/workflow operations now carry deprecation metadata; and asset metadata PATCH is now marked deprecated upstream.
- **The active local patch set is smaller.** [`scripts/spec-patches.ts`](scripts/spec-patches.ts) now only patches unresolved file-ingestion and routines issues documented in [`OPENAPI_BUG_REPORTS.md`](OPENAPI_BUG_REPORTS.md).
