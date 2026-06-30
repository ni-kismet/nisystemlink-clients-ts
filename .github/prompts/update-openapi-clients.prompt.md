---
name: "Update OpenAPI Clients"
description: "Regenerate SystemLink TypeScript clients from updated OpenAPI specs, review public API changes, update the Beachball changelog entry with concrete SDK deltas, validate, and open a PR."
argument-hint: "Optional context about the upstream OpenAPI update"
agent: "agent"
---

Update this repository for the latest SystemLink OpenAPI specifications.

Follow this workflow:

1. Regenerate clients with the existing project scripts and update exports when needed.
2. Run `npm run typecheck` immediately after regeneration and fix any breakages at the owning source:
   - prefer spec patches in [scripts/spec-patches.ts](../../scripts/spec-patches.ts)
   - update tests or call sites to match regenerated SDK signatures
   - do not hand-edit generated files in [src/generated](../../src/generated) unless explicitly requested
3. Review the public SDK surface changes in [src/generated](../../src/generated), especially `index.ts` exports and any request or response type changes.
4. Update or create the Beachball change file with concrete changelog text:
   - call out renamed exports
   - call out signature changes that require caller updates
   - note newly added endpoints or exported types when they are user-facing
   - avoid generic comments such as "updated generated clients"
5. Validate the update with:
   - `npm run typecheck`
   - `npm test`
   - `npm run check` when published package content changed
6. Review the diff for user-facing risks, especially breaking API changes.
7. If the work is ready, create a branch, commit, push, and open a PR with:
   - a concise summary of the OpenAPI refresh
   - the notable public API changes
   - the validation results

Use the guidance in [CONTRIBUTING.md](../../CONTRIBUTING.md) for project conventions.

Expected output:

- a short review of important API changes or risks
- the final Beachball change note text
- validation status
- the PR link if a PR was created