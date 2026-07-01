# Kabeer OS App Architecture

Last updated: 2026-07-02

This is the catch-up file for returning to the project after time away.

Read this first to understand what the app is, how the pieces fit together, what exists today, and what should happen next. `PLAN.md` remains the execution checklist. `CORE-PLAN.md` remains the durable architecture philosophy. `FUTURE-PLAN.md` remains the long-term roadmap.

## Product Shape

Kabeer OS is a local personal operator for getting from laptop open to meaningful work quickly.

The first useful loop is:

```text
GitHub signal -> work item -> morning brief -> recommended action -> approved worker
```

The product is not an LLM chat app and not a Codex wrapper. The LLM layer will come later as an intent router and summarizer. It should never directly execute commands or bypass approval policy.

## Current Direction

We are intentionally building the deterministic GitHub button flow first.

For now:

- Dashboard reads a morning brief.
- User clicks sync.
- Backend runs known GitHub sync capability.
- Backend normalizes GitHub signals into work items.
- Dashboard shows important work and recommended actions.

Later:

- Voice/text inputs route through the same capability system.
- An LLM maps messy user requests to known capabilities.
- Side-effecting capabilities still require approval.

## Runtime Architecture

```text
apps/web dashboard
  -> apps/server Fastify API
  -> capability registry
  -> providers/connectors
  -> local storage / GitHub / Codex
```

The frontend should call high-level API routes only. It should not send shell commands or provider-specific command strings.

Good:

```text
POST /api/github/sync
POST /api/codex/start-task
```

Bad:

```text
POST /api/run-command
{ "command": "gh issue list ..." }
```

## Core Flow

The durable system shape is:

```text
input -> proposed capability -> approval policy -> execution -> audit log
```

Current inputs:

- dashboard load
- dashboard button click

Future inputs:

- typed command
- voice transcript
- schedule
- notification click
- menu bar action

All inputs should eventually produce a proposed capability call.

## Capability Registry

The server owns the capability registry.

Shared capability metadata lives in:

```text
packages/contracts/src/capabilities.ts
```

Server registry implementation lives in:

```text
apps/server/src/capabilities/registry.ts
```

Public capability map endpoint:

```text
GET /api/capabilities
```

Current capabilities:

| Capability | Status | Risk | Approval | Purpose |
| --- | --- | --- | --- | --- |
| `morningBrief.read` | available | read | none | Return current morning brief. |
| `github.sync` | planned | read | none | Fetch GitHub signals and normalize work items. |
| `workItem.markSeen` | planned | write | none | Mark a known work item as seen. |
| `url.open` | planned | read | none | Open a known URL from a work item or action. |
| `codex.draftTask` | planned | draft | none | Draft a Codex task without starting it. |
| `codex.startTask` | planned | write | required | Start Codex through a provider after approval. |

Important rule: a capability can be listed before it is executable. Planned capabilities must throw if execution is attempted before they are implemented.

## Approval Policy

Approval is app-owned, not LLM-owned.

Default policy:

| Risk | Typical Approval |
| --- | --- |
| `read` | no approval |
| `draft` | no approval |
| `write` | approval depends on action |
| `destructive` | strong approval |

Current examples:

- `github.sync`: read-only, no approval.
- `morningBrief.read`: read-only, no approval.
- `codex.draftTask`: draft, no approval.
- `codex.startTask`: write, approval required.
- future message sending: write, approval required.
- future destructive actions: strong approval required.

## Current Backend Routes

Implemented:

```text
GET /api/morning-brief
GET /api/capabilities
```

`GET /api/morning-brief` now executes the internal `morningBrief.read` capability. The response is mocked but typed.

Planned next:

```text
POST /api/github/sync
```

That route should execute `github.sync` through the capability registry.

## Current Data Contracts

Morning brief contracts:

```text
packages/contracts/src/morning-brief.ts
```

Main concepts:

- `WorkItem`
- `RecommendedAction`
- `MorningBrief`

`WorkItem` uses generic domain names so Slack, Teams, Calendar, Gmail, and other sources can be added later without rewriting the dashboard.

Capability contracts:

```text
packages/contracts/src/capabilities.ts
```

Main concepts:

- capability name
- risk
- approval requirement
- availability status
- input/output schema names

## Provider Boundaries

Providers are replaceable implementations behind stable interfaces.

Near-term provider:

```text
GitHubProvider
```

It should hide `gh` CLI details from routes and capabilities.

Future providers:

```text
CodingAgentProvider
ModelProvider
CommunicationProvider
StorageProvider
```

Provider rule: app code should ask for domain operations, not shell commands.

Example:

```text
githubProvider.syncWorkItems(...)
```

not:

```text
run("gh pr list ...")
```

## GitHub Sync Plan

Recommended first version:

1. Configure a repo list locally.
2. Use `gh` CLI from the server only.
3. Use allowlisted read-only commands.
4. Fetch:
   - PRs requesting review
   - assigned issues
   - failed workflow runs for configured repos
5. Normalize everything into `WorkItem[]`.
6. Return/update the morning brief.

Why configured repos first:

- assigned issues and review requests can be searched broadly
- failed workflows need specific repos
- repo discovery can come later
- it keeps the first useful sync predictable

## Storage Plan

Current state: mocked data in memory/code.

Next storage step:

- start with a local JSON file if fastest
- store last sync result
- store last sync timestamp
- store seen work item IDs
- store basic action/audit history

Later:

- move to SQLite if JSON starts getting awkward

## Audit Log Plan

Audit logging is not implemented yet, but it is core to the architecture.

Each executed capability should eventually record:

- timestamp
- input source
- capability name
- risk
- approval result
- execution status
- summary of result or error

This matters because future versions may start Codex tasks, send messages, or operate across work systems.

## LLM Orchestrator Plan

Do not build the orchestrator before the GitHub button loop works.

When added, the orchestrator should only do this:

```text
human input -> structured intent -> proposed capability call
```

It should not:

- run commands
- send messages
- edit files
- start Codex directly
- decide permissions

The app validates the intent, checks approval policy, executes through providers, and writes audit records.

## Code Map

Important files:

```text
PLAN.md
CORE-PLAN.md
FUTURE-PLAN.md
APP-ARCHITECTURE.md
packages/contracts/src/capabilities.ts
packages/contracts/src/morning-brief.ts
apps/server/src/capabilities/registry.ts
apps/server/src/routes/capabilities.ts
apps/server/src/routes/morning-brief.ts
apps/server/src/services/morning-brief.ts
apps/web/src/routes/_auth/dashboard.tsx
apps/web/src/lib/api.ts
```

## Current Status

Done:

- first typed morning brief contract
- mocked `GET /api/morning-brief`
- capability metadata contract
- server capability registry
- `GET /api/capabilities`
- `morningBrief.read` routed through registry

Next:

- wire dashboard to `GET /api/morning-brief`
- implement `github.sync` capability
- add `POST /api/github/sync`
- add GitHub provider using allowlisted `gh` CLI calls
- decide local repo config format

## Maintenance Rule

Update this file whenever one of these changes:

- a new capability is added
- a capability risk or approval requirement changes
- a provider boundary is introduced
- an API route becomes part of the main product flow
- storage/audit strategy changes
- the next milestone changes

This file should stay readable. Keep detailed task checklists in `PLAN.md`.
