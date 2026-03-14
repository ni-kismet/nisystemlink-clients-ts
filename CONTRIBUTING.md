# Contributing to @ni/systemlink-clients-ts

Thank you for your interest in contributing! This document explains how to set up your development environment, make changes, and submit them.

## Prerequisites

- Node.js >= 20
- npm

## Getting started

```bash
git clone https://github.com/ni-kismet/nisystemlink-clients-ts.git
cd nisystemlink-clients-ts
npm install
npm run build
```

## Making changes

### 1. Create a branch

```bash
git checkout -b my-feature
```

### 2. Make your changes

- **Source code** lives in `src/`.
- **Generated clients** are in `src/generated/` — do not edit these directly. Instead, modify the generation scripts in `scripts/` or add spec patches in `scripts/spec-patches.ts`.
- Run `npm run typecheck` to validate TypeScript.
- Run `npm run build` to compile.

### 3. Create a change file

This project uses [beachball](https://microsoft.github.io/beachball/) for semantic versioning. Every PR that changes published package content must include a change file.

```bash
npm run change
```

Beachball will prompt you to select a change type:

- **patch** — bug fixes, documentation updates
- **minor** — new features, new service clients
- **major** — breaking API changes

Write a short description of your change. This will appear in the CHANGELOG.

> If your PR only touches CI, tests, or scripts (not the published package), you can skip the change file — beachball's `ignorePatterns` will not require one.

### 4. Run tests

Integration tests require a SystemLink server:

```bash
cp .env.example .env   # fill in SYSTEMLINK_API_URL and SYSTEMLINK_API_KEY
npm test
```

Tests self-skip when credentials are not configured, so `npm test` always passes in CI.

### 5. Submit a pull request

Push your branch and open a PR against `main`. CI will:

- Build and typecheck on Node.js 20 and 22
- Verify a change file exists (if required)
- Run tests

## Regenerating API clients

To regenerate all clients from the latest OpenAPI specs:

```bash
npm run generate          # regenerate all 27 clients
npm run generate:exports  # update package.json exports map
npm run build             # compile
npm run typecheck         # verify output
```

## Code of conduct

Please be respectful and constructive in all interactions.
