# Kabeer OS App Architecture

Last updated: 2026-07-03

This is the catch-up file for returning to the project after time away.

Read this first to understand what the app is, how the pieces fit together, what exists today, and what should happen next. `PLAN.md` remains the execution checklist. `CORE-PLAN.md` remains the durable architecture philosophy. `CHAT-PLAN.md` covers the generic assistant loop and replaceable LLM provider plan. `FUTURE-PLAN.md` remains the long-term roadmap.

## Product Shape

Kabeer OS is a local personal operator for getting from laptop open to meaningful work quickly.

The first useful loop is:

```text
GitHub activity/attention signal -> deterministic summary -> dashboard/chat -> future action -> approved worker
```

The product is not an LLM chat app and not a Codex wrapper. The LLM layer will come later as an intent router and summarizer. It should never directly execute commands or bypass approval policy.

## Current Direction

We are intentionally building the deterministic GitHub button flow first.

For now:

- User clicks the GitHub sync button.
- Backend runs known GitHub sync and attention capabilities.
- Backend reads recent GitHub user activity and attention signals.
- Backend normalizes GitHub activity and attention items.
- Backend generates a deterministic daily summary from normalized GitHub data.
- Dashboard shows the summary, project-wise activity, new activity, and items that need attention.
- Dashboard chat can ask the assistant GitHub questions through read-only capabilities.

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
| `github.sync` | available | read | none | Fetch recent GitHub activity and normalize work items. |
| `github.attentionSync` | available | read | none | Fetch GitHub items that need attention. |
| `github.searchRepositories` | available | read | none | Search readable GitHub repositories by name. |
| `github.searchIssues` | available | read | none | Search assigned issues in a specific repository. |
| `github.dailySummary.generate` | available | read | none | Generate a deterministic daily summary from normalized GitHub data. |
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
GET /api/github/sync/latest
POST /api/assistant/chat
POST /api/github/sync
POST /api/github/attention/sync
POST /api/github/daily-summary
```

`GET /api/morning-brief` now executes the internal `morningBrief.read` capability. The response is mocked but typed.

`GET /api/github/sync/latest` reads the latest persisted GitHub sync snapshot from local server storage.

`POST /api/github/sync` executes the internal `github.sync` capability, persists the result, and returns a dashboard snapshot. The first version returns GitHub events for the authenticated GitHub user, filtered to the requested time window. Push events include normalized commit metadata so the dashboard and future orchestrator can show commit messages without re-reading raw GitHub payloads.

`POST /api/github/attention/sync` executes the internal `github.attentionSync` capability. It fetches review requests, assigned open items, mentions, and failed workflow runs. If the request does not provide repositories, the route uses repositories from the latest persisted GitHub activity sync for workflow checks.

`POST /api/github/daily-summary` executes the internal `github.dailySummary.generate` capability. It does not call GitHub. It accepts the already-normalized sync snapshot and attention result, counts/ranks facts deterministically, and returns a typed headline, paragraph, project summaries, and attention counts.

`POST /api/assistant/chat` runs the generic assistant loop. The current runtime model provider is OpenRouter behind `ModelProvider`. The assistant can only call allowlisted capabilities through the registry; it cannot run shell commands directly.

Current assistant model config:

```text
MODEL_PROVIDER=openrouter
OPENROUTER_MODEL=openai/gpt-4.1-mini
```

`openai/gpt-4.1-mini` is the default for now because the assistant loop needs cheap, fast, structured-output-capable tool routing more than frontier reasoning. The provider boundary stays generic: changing model vendors should mean changing env/config or adding another `ModelProvider`, not rewriting the assistant loop.

Default request:

```text
POST /api/github/sync
{}
```

Default behavior:

- `lookbackHours` defaults to `24`
- `since` can override the computed lookback window
- max lookback is `168` hours

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

Assistant chat contracts:

```text
packages/contracts/src/assistant.ts
```

Main concepts:

- `AssistantMessage`
- `AssistantDecision`
- `AssistantObservation`
- `AssistantStep`
- `AssistantChatInput`
- `AssistantChatResult`

GitHub sync contracts:

```text
packages/contracts/src/github.ts
```

Main concepts:

- `GitHubSyncInput`
- `GitHubActivity`
- `GitHubSyncResult`
- `GitHubSyncStoreState`
- `GitHubSyncSnapshot`
- `GitHubAttentionInput`
- `GitHubAttentionItem`
- `GitHubAttentionResult`
- `GitHubRepositorySearchInput`
- `GitHubRepositorySearchResult`
- `GitHubIssueSearchInput`
- `GitHubIssueSearchResult`
- `GitHubDailySummaryInput`
- `GitHubDailySummaryResult`

`GitHubActivity` is the normalized unit the app should pass around. It includes the repo/project, activity type, action label, title, summary, URL, timestamp, and provider metadata such as push branch, commit count, and commit messages.

`GitHubSyncSnapshot` is what the dashboard reads. It contains the latest sync result plus `seenActivityIds` and `newActivityIds`. The time window and newness are separate concepts:

```text
last 24h = activity time filter
new = activity ID not seen before the previous sync
```

`GitHubAttentionItem` is the normalized unit for things that need action. Current kinds are:

- `review_request`
- `assigned`
- `mention`
- `failed_workflow`

`GitHubDailySummaryResult` is the deterministic wording layer. It summarizes the existing normalized facts. It should not invent facts or call providers. Later, an LLM-backed summary provider can rewrite this structured result, but the source facts should still come from the deterministic builder.

## Local Storage

Current local store:

```text
apps/server/.data/github-sync.json
```

This file is ignored by git. It stores:

- `lastSync`
- `seenActivityIds`
- `lastNewActivityIds`

Store boundary:

```text
apps/server/src/stores/github-sync-store.ts
```

The route layer uses this store after capability execution. The `GitHubProvider` still only fetches and normalizes GitHub data.

## Provider Boundaries

Providers are replaceable implementations behind stable interfaces.

Near-term provider:

```text
GitHubProvider
```

Implemented provider:

```text
apps/server/src/providers/github.ts
```

It hides `gh` CLI details from routes and capabilities.

Current allowlisted commands:

```text
gh api user --jq .login
gh api /users/{login}/events?per_page=100
gh api /repos/{owner}/{repo}/compare/{before}...{head}
gh api /search/repositories?q={safe-query}&per_page={1-20}
gh api /search/issues?q={safe-query}&per_page={1-50}
gh api /repos/{owner}/{repo}/actions/runs?status=failure&per_page=20
```

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

Current deterministic summary service:

```text
apps/server/src/services/github-daily-summary.ts
```

It is deliberately not a provider because it does not fetch external data. It compiles already-normalized GitHub facts into stable summary text.

Implemented model provider boundary:

```text
apps/server/src/providers/model.ts
apps/server/src/providers/openrouter-model.ts
```

`ModelProvider` is the generic interface. `OpenRouterModelProvider` is the first runtime implementation. The assistant orchestrator depends on `ModelProvider`, not OpenRouter directly.

Current default model:

```text
openai/gpt-4.1-mini via OpenRouter
```

Important model-provider details:

- OpenRouter is only the transport/provider today.
- The underlying model is currently an OpenAI model.
- The app requests structured JSON decisions with `response_format`.
- The app validates the model response with Zod before executing anything.
- The model never receives raw shell access.

Implemented assistant loop:

```text
apps/server/src/services/assistant-orchestrator.ts
apps/server/src/routes/assistant.ts
```

The assistant loop asks the model for one structured decision at a time, validates it, executes allowed capabilities through the registry, adds observations, and continues until it can respond, ask the user, stop, or hit the step limit.

## GitHub Sync Plan

Recommended first version:

1. Use `gh` CLI from the server only.
2. Use allowlisted read-only commands.
3. Fetch authenticated user's recent GitHub events.
4. Filter to the last 24 hours by default.
5. Normalize activity into `GitHubActivity[]`.
6. Normalize activity into `WorkItem[]`.
7. Return sync result from `POST /api/github/sync`.

Current limitation:

- GitHub user events are the first approximation of "what I did."
- This is good enough for an initial 24-hour activity view.
- Later versions should add deeper queries for private review/comment edge cases if needed.

Current attention version:

1. Search open PRs requesting review.
2. Search open assigned issues/PRs.
3. Search open mentions.
4. Fetch recent failed workflow runs for repos discovered from recent activity.
5. Show those signals separately from the last-24-hour activity feed.

Current assistant GitHub search version:

1. Search repositories by user-provided name fragment.
2. Search open/closed/all issues in a specific repository.
3. Resolve `assignee: "me"` through the authenticated GitHub user.
4. Return normalized issue results to the assistant loop.

## Storage Plan

Current state: GitHub sync uses a local JSON store at `apps/server/.data/github-sync.json`. The mocked morning brief endpoint still exists separately.

Next storage step:

- decide whether generated summaries should be persisted or recomputed on demand
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
apps/server/src/routes/github.ts
apps/server/src/routes/assistant.ts
apps/server/src/routes/morning-brief.ts
apps/server/src/providers/github.ts
apps/server/src/providers/model.ts
apps/server/src/providers/openrouter-model.ts
apps/server/src/services/assistant-orchestrator.ts
apps/server/src/stores/github-sync-store.ts
apps/server/src/services/morning-brief.ts
apps/web/src/routes/_auth/dashboard.tsx
apps/web/src/lib/api.ts
packages/ui/src/components/message-scroller.tsx
```

## Current Status

Done:

- first typed morning brief contract
- mocked `GET /api/morning-brief`
- capability metadata contract
- server capability registry
- `GET /api/capabilities`
- `morningBrief.read` routed through registry
- assistant chat contract
- generic `ModelProvider` interface
- `OpenRouterModelProvider`
- assistant orchestrator with bounded capability loop
- GitHub sync contract
- read-only `GitHubProvider` using allowlisted `gh api` calls
- `github.sync` routed through registry
- `github.attentionSync` routed through registry
- `github.searchRepositories` routed through registry
- `github.searchIssues` routed through registry
- `github.dailySummary.generate` routed through registry
- deterministic GitHub daily summary service
- file-backed GitHub sync store at `apps/server/.data/github-sync.json`
- `GET /api/github/sync/latest`
- `POST /api/github/sync`
- `POST /api/github/attention/sync`
- `POST /api/github/daily-summary`
- `POST /api/assistant/chat`
- dashboard chat panel using shadcn `MessageScroller`
- dashboard reads `GET /api/github/sync/latest`
- dashboard button calls `POST /api/github/sync`
- dashboard renders deterministic daily summary from GitHub activity and attention data
- dashboard renders recent GitHub activity from the persisted sync snapshot, grouped by project and split into pushes, issues, pull requests, and other activity
- dashboard shows new activity from `newActivityIds`
- dashboard renders GitHub attention items from `github.attentionSync`

Next:

- manually test dashboard chat with a real `OPENROUTER_API_KEY`
- harden model provider timeouts/retries and error messages
- add next GitHub read tools if needed, such as PR search or issue detail fetch

## Maintenance Rule

Update this file whenever one of these changes:

- a new capability is added
- a capability risk or approval requirement changes
- a provider boundary is introduced
- an API route becomes part of the main product flow
- storage/audit strategy changes
- the next milestone changes

This file should stay readable. Keep detailed task checklists in `PLAN.md`.
