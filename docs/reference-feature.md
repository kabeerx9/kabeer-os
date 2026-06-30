# Reference Feature: Example Projects

This starter ships a deliberately isolated `ExampleProject` CRUD flow so adopters
can see how authenticated data moves through the stack before replacing it with a
real product domain.

## What it demonstrates

- A Prisma model owned by the local `User` record synced from Clerk
- Shared Zod contracts for request and response validation
- Owner-scoped Fastify routes that never expose `ownerId`
- Typed web and native API clients built on `@app-starter/contracts`
- Dashboard UI panels with list, create, edit, delete, loading, empty, and error states

## Authorization invariant

Every server read and write filters by the authenticated Clerk user through the
local `User` relation. Non-owned and nonexistent IDs both return `404 Not found`.

## Apply the schema in real projects

After pulling these changes, generate the Prisma client and apply the schema to
your database:

```bash
pnpm run db:generate
pnpm run db:push
```

Use `pnpm run db:migrate` instead when you maintain migration history for production.

## Removal inventory

Delete or revert the following when you replace this reference feature:

### Database

- `packages/db/prisma/schema/schema.prisma`
  - `ExampleProject` model
  - `exampleProjects ExampleProject[]` field on `User`
  - Fields: `id`, `ownerId`, `name`, `description`, `createdAt`, `updatedAt`
  - Index: `@@index([ownerId, updatedAt])`
- `packages/db/src/types.ts` — `ExampleProject` type export

### Contracts

- `packages/contracts/src/example-projects.ts`
- `packages/contracts/src/example-projects.test.ts`
- `packages/contracts/src/index.ts` — example project exports
- `packages/contracts/package.json` — `./example-projects` export map entry

### Server

- `apps/server/src/services/example-projects.ts`
- `apps/server/src/routes/example-projects.ts`
- `apps/server/src/routes/example-projects.test.ts`
- `apps/server/src/index.ts` — route registration and `PATCH` in CORS methods

### Web client

- `apps/web/src/lib/api.ts` — example project client functions
- `apps/web/src/components/example-projects.tsx`
- `apps/web/src/routes/_auth/dashboard.tsx` — `ExampleProjectsPanel` usage

### Native client

- `apps/native/lib/api.ts` — example project client functions
- `apps/native/components/example-projects.tsx`
- `apps/native/app/index.tsx` — `ExampleProjectsPanel` usage

### Documentation

- `docs/reference-feature.md`
- `README.md` — link to this document

### Search terms

Use these queries to confirm nothing was missed:

```bash
rg -n "ExampleProject|example-projects" packages apps docs/reference-feature.md
```

Every remaining hit should belong to this inventory or to your replacement domain
after you rename the feature intentionally.
