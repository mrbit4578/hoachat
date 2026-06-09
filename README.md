# Hoachat

Monorepo scaffold for a ZDHC chemical control system.

## Scope

This repository is organized for a React frontend, Node.js backend, shared packages, and PostgreSQL database assets. The first scaffold focuses on the domain foundations needed for:

- chemical catalog and ZDHC compliance control
- inbound, outbound, and stock ledger workflows
- inventory lots tracked by lot number and relevant dates
- import/export, filtering, quick search, and reporting foundations

## Workspace Layout

- `apps/web` - React web application shell
- `apps/api` - Node.js API application shell
- `packages/shared` - shared types, enums, schemas, constants, and utilities
- `packages/ui` - shared UI components and styles
- `packages/config` - shared TypeScript, lint, and environment conventions
- `database` - PostgreSQL schema, migrations, seeds, and views
- `docs` - module, API, and database documentation

See `docs/repo-structure-plan.md` for the source scaffold plan.
