# Fullstack Mobile Starter Template

This repository is a clean template snapshot derived from the monorepo starter. It keeps the reusable architecture and removes product-specific planning/spec files.

## Included

- Expo native app with Clerk auth wiring
- Fastify server app
- Shared contracts, env, db, ui, and config packages
- Native design-system foundation with reusable tokens and primitives
- Example authenticated CRUD flow for reference

## Not Included

- Local `.env` files
- `node_modules`, `.expo`, `.turbo`, build output, or coverage output
- Product-specific `client/` specs and planning artifacts

## First Steps

1. Copy each `.env.example` to `.env` and fill project-specific values.
2. Rename app/package identifiers for the new product.
3. Replace placeholder branding in `apps/native/design-system` and app assets.
4. Run `pnpm install`.
5. Run `pnpm run check-types`.
