# nisystemlink-clients-ts

Auto-generated TypeScript API clients for all NI SystemLink services, generated from their official OpenAPI specifications.

- **27 services** with full TypeScript types, SDK functions, and tree-shakeable ESM/CJS builds
- **Fetch-based** — uses the browser `fetch` API; works in Angular, React, Node.js, and any modern runtime
- **No runtime dependencies** — the fetch client is bundled inline

---

## Installation

```bash
npm install @ni/systemlink-clients-ts
```

## Quick start (Angular)

Each service has two sub-paths:

| Import path                                  | What you get                                                    |
| -------------------------------------------- | --------------------------------------------------------------- |
| `@ni/systemlink-clients-ts/<service>`        | SDK functions + all TypeScript types                            |
| `@ni/systemlink-clients-ts/<service>/client` | `createClient`, `createConfig`, and the default client instance |

### Inject a configured client in an Angular service

```typescript
// src/app/core/alarm.service.ts
import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";

import {
  createClient,
  createConfig,
} from "@ni/systemlink-clients-ts/alarm/client";
import {
  postNialarmV1QueryInstances,
  type QueryRequest,
  type QueryResponse,
} from "@ni/systemlink-clients-ts/alarm";

@Injectable({ providedIn: "root" })
export class AlarmService {
  private readonly client = createClient(
    createConfig({
      baseUrl: environment.systemlinkBaseUrl,
      headers: { "x-ni-api-key": environment.apiKey },
    }),
  );

  async queryAlarms(filter?: string): Promise<QueryResponse | undefined> {
    const body: QueryRequest = { filter };
    const { data } = await postNialarmV1QueryInstances({
      client: this.client,
      body,
    });
    return data;
  }
}
```

### Angular `environment.ts` example

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  systemlinkBaseUrl: "https://your-systemlink-server.example.com",
  apiKey: "your-x-ni-api-key",
};
```

---

## Available services

| Sub-path                      | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `alarm`                       | Alarm management (instances, acknowledgement) |
| `asset-management`            | Assets, calibration history, asset summary    |
| `auth`                        | Authentication and authorization tokens       |
| `comments`                    | Comments on SystemLink resources              |
| `dataframe`                   | DataFrame table service                       |
| `dynamic-form-fields`         | Custom fields and schema management           |
| `feeds`                       | Package feed management                       |
| `file-ingestion`              | File upload and ingestion                     |
| `location`                    | Location hierarchy and geospatial             |
| `notebook`                    | Jupyter notebook management                   |
| `notebook-execution`          | Notebook execution jobs                       |
| `notebook-execution-artifact` | Execution output artifacts                    |
| `notification`                | Notifications and subscriptions               |
| `repository`                  | Package repository (NI Package Manager)       |
| `routines`                    | Scheduled and event-driven routines           |
| `routines-v2`                 | Routines API v2                               |
| `specification-management`    | Test specification management                 |
| `systems-management`          | Managed systems fleet                         |
| `systems-state`               | System state and health                       |
| `tag-historian`               | Historical tag values                         |
| `tags`                        | Tag reads and writes                          |
| `test-monitor`                | Test results, steps, products                 |
| `user`                        | Users, workspaces, and access                 |
| `user-data`                   | User-defined structured data                  |
| `web-application`             | Web application registry                      |
| `work-item`                   | Work items (tasks, defects)                   |
| `work-order`                  | Work orders                                   |

---

## Client configuration patterns

### One shared client per Angular module

```typescript
import {
  createClient,
  createConfig,
} from "@ni/systemlink-clients-ts/test-monitor/client";

// Create once, inject everywhere
export const testMonitorClient = createClient(
  createConfig({
    baseUrl: "https://your-server.example.com/nitestmonitor",
    headers: { "x-ni-api-key": "your-key" },
  }),
);
```

> **Note on base URLs**: Some services embed the service prefix in their spec server URL
> (e.g. `test-monitor` → `/nitestmonitor`, `tags` → `/nitag/v2`, `user` → `/niuser/v1`).
> The `baseUrl` must include this prefix. For services like `alarm`, `feeds`, and `asset-management`
> the prefix is already part of every operation path, so `baseUrl` is just the server root.

### Services with path-prefixed base URLs

| Service        | Required `baseUrl` suffix |
| -------------- | ------------------------- |
| `test-monitor` | `/nitestmonitor`          |
| `tags`         | `/nitag`                  |
| `user`         | `/niuser/v1`              |

All other services: use the bare server root as `baseUrl`.

---

## Regenerating the API clients

The clients are generated from live OpenAPI specs hosted at `dev-api.lifecyclesolutions.ni.com`.  
To regenerate after a spec update:

```bash
npm run generate          # regenerate all 27 clients
npm run generate:exports  # update package.json exports map (if services changed)
npm run build             # compile new sources
```

---

## Development

```bash
npm run build          # compile ESM + CJS + type declarations → dist/
npm run build:watch    # watch mode
npm run typecheck      # TypeScript type check (no emit)

# Integration tests (requires a real SystemLink server)
cp .env.example .env   # fill in SYSTEMLINK_API_URL and SYSTEMLINK_API_KEY
npm test
```
