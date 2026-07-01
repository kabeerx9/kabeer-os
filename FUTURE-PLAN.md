# Kabeer OS Future Plan

This file captures the longer-term direction.

Do not use this as the immediate build checklist. The immediate build remains:

```text
GitHub signals -> work items -> recommendations -> approved Codex task
```

## Product Direction

Kabeer OS should become a local personal operating layer for work.

The long-term experience:

```text
I open my laptop.
I ask: "What happened yesterday?"
The app summarizes important work across GitHub, Slack, mail, calendar, and local repos.
I ask: "What should I do first?"
The app recommends a focused next action.
I say: "Tell Codex to start with that."
The app prepares a Codex task and asks for approval.
I say: "Open my mail."
The app opens mail through the native layer.
```

The product should feel futuristic, but it should be built from reliable, narrow loops.

## Roadmap Layers

### Layer 1: Local Web Dashboard

Use the current web app and Fastify backend.

Goals:

- GitHub morning brief.
- Work item ranking.
- Recommended actions.
- Approved Codex task launch.
- Local audit log.

This proves the core loop.

### Layer 2: LLM Intent Routing

Add a command box and later voice input.

The LLM maps natural language to known capabilities:

```text
input -> intent router -> proposed action -> approval -> execution -> audit log
```

Examples:

- "What happened yesterday?" -> summarize morning brief.
- "What should I do first?" -> recommend next action.
- "Tell Codex to start with the CI failure." -> draft/start Codex task with approval.
- "Open the PR." -> open URL.

The LLM should return structured intent, not directly execute actions.

### Layer 3: Communication Connectors

Add communication systems after GitHub works.

Possible connectors:

- Slack
- Microsoft Teams
- Gmail
- iMessage, only if local automation is practical

The internal model should stay generic:

```text
WorkMessage
MessageThread
DraftMessage
CommunicationProvider
```

Slack should not become the core model because future companies may use Teams or another system.

### Layer 4: Native macOS App

After the local web app proves useful, add a native shell.

Possible approach:

- Swift macOS app if native learning and system integration are the priority.
- Tauri/Electron if reusing the web UI quickly is the priority.

Native responsibilities:

- menu bar
- launch at login
- notifications
- global shortcut
- microphone/push-to-talk
- open apps
- system-level actions
- Keychain storage

The native app should call the same backend for core logic:

```text
Swift/Tauri/Electron UI -> local backend -> connectors/providers/actions
```

System actions should still go through approval and audit policies.

### Layer 5: Memory

Start memory with structured storage, not vector search.

First store:

- work items
- sync history
- action history
- approvals
- summaries
- user preferences
- useful project/repo metadata

Later add semantic memory when there is enough data to justify it.

Potential future memory system:

```text
structured event log + summaries + embeddings/vector retrieval
```

The LLM can propose memory candidates, but the app should decide what is stored.

High-value or sensitive long-term memories may require approval.

### Layer 6: Broader Computer Automation

Use system-level automation only after the approval system is solid.

Possible capabilities:

- open an app
- open a URL
- open terminal in a repo
- start a local dev server
- show a file/folder
- run allowlisted scripts
- use UI automation for apps without APIs

Avoid arbitrary command execution from natural language.

## Provider Strategy

Keep major systems replaceable.

### Coding Workers

Start with Codex.

Future options:

- Codex SDK/app-server
- Codex CLI fallback
- open-source coding agent
- remote coding worker

### LLM Providers

Support a provider interface.

Possible options:

- OpenAI
- OpenRouter
- Anthropic
- local model

Use LLMs for:

- intent routing
- summarization
- ranking
- drafting
- clarification

Do not use LLMs as the authority for permissions or execution.

### Connectors

Each external service should be a connector:

- GitHubConnector
- SlackConnector
- TeamsConnector
- GmailConnector
- CalendarConnector

Each connector should declare capabilities:

```ts
type ConnectorCapabilities = {
  canReadHistory: boolean;
  canListenRealtime: boolean;
  canDraft: boolean;
  canSend: boolean;
  canActWithoutUserApproval: boolean;
  accessScope: "user" | "bot" | "workspace" | "local-device";
};
```

## Safety Rules

- Summaries can run automatically.
- Drafts can be generated automatically.
- Sending messages requires approval.
- Starting Codex requires approval.
- Editing files requires approval.
- Running shell commands requires approval unless explicitly allowlisted.
- Destructive actions require stronger confirmation.
- Unknown requests should ask for clarification.

## Memory Rule

Do not start with a vector database.

Start with:

```text
SQLite or JSON event log
```

Add embeddings/vector retrieval only when the product has enough real history that semantic lookup is clearly useful.

## Build Order

1. GitHub + Codex morning loop.
2. Typed command box with intent routing.
3. Push-to-talk voice for the same intent routing.
4. Slack or Calendar connector.
5. Native macOS shell.
6. Structured memory improvements.
7. Semantic/vector memory.
8. Broader system automation.

## Guiding Principle

Start small and quick.

Make one loop feel magical before adding the next system.

The first loop:

```text
GitHub signal -> work item -> recommendation -> approval -> Codex task
```

Everything else should build on that.
