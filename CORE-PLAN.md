# Kabeer OS Core Plan

This file captures the durable architecture idea for Kabeer OS.

`PLAN.md` is the execution checklist. This file is the system shape we should preserve while building.

## Core Idea

Kabeer OS is not a chat app and not a Codex wrapper.

It is a local personal operator:

```text
input -> intent router -> proposed action -> approval policy -> execution -> audit log
```

The app should let me type, speak, click, or trigger scheduled checks, then map that input into one of the app's known capabilities.

The LLM can reason and suggest. The app validates, asks for approval when needed, executes through a provider, and records what happened.

## Inputs

Inputs are different ways to ask the system for something:

- typed command
- voice transcript
- dashboard button
- scheduled morning sync
- notification click
- future keyboard shortcut
- future menu bar action

All inputs should eventually go through the same intent/action pipeline.

## Intent Router

The intent router takes messy human input and converts it into structured intent.

Example:

```text
Tell Codex to fix the CI failure from yesterday
```

Should become:

```ts
{
  intent: "start_codex_task",
  target: {
    type: "work_item",
    hint: "CI failure from yesterday"
  },
  confidence: 0.91,
  requiresApproval: true
}
```

The intent router should use an LLM, but it should only return structured data that matches known schemas.

It should not directly run commands, send messages, edit files, start Codex, or control apps.

## Capabilities

The app should expose a registry of capabilities.

```ts
type Capability = {
  name: string;
  description: string;
  inputSchema: unknown;
  risk: "read" | "draft" | "write" | "destructive";
  requiresApproval: boolean;
};
```

Examples:

- `summarizeMorningBrief`
- `listWorkItems`
- `explainWorkItem`
- `draftCodexTask`
- `startCodexTask`
- `openUrl`
- `openApp`
- `markWorkItemSeen`
- `draftMessage`
- `sendApprovedMessage`

The router should choose from available capabilities. If no capability fits, the app should ask a clarifying question or say it cannot do that yet.

Current implementation:

- Shared capability metadata lives in `packages/contracts`.
- The server owns the capability registry.
- `GET /api/capabilities` exposes the current capability map.
- `GET /api/morning-brief` executes the internal `morningBrief.read` capability.
- Planned capabilities can be listed before they are executable, but they cannot be run until implemented.

## Approval Policy

The approval layer is what makes the system trustworthy.

General policy:

- Read-only summaries can run automatically.
- Drafting can run automatically.
- Opening a URL can usually run automatically.
- Starting Codex should require approval.
- Sending messages should require approval.
- Editing files should require approval.
- Running shell commands should require approval unless they are explicitly allowlisted.
- Destructive actions require stronger confirmation.

The system should show the proposed action before execution:

```text
Intent: Start Codex task
Target: Failed CI on repo X
Prompt: ...
Risk: write

[Approve] [Cancel]
```

## Execution

Execution should happen only through app-owned providers and connectors.

The frontend should never send arbitrary shell commands.

Good:

```text
POST /api/actions/start-codex-task
```

Bad:

```text
POST /api/run-command
{ "command": "..." }
```

The backend should expose high-level actions only.

## Providers

Providers are replaceable implementations behind stable interfaces.

### Coding Agent Provider

Codex is the first coding worker, but it should not be hardcoded into the product shape.

```ts
interface CodingAgentProvider {
  startTask(task: CodingTask): Promise<AgentRun>;
  cancelRun(runId: string): Promise<void>;
}
```

First provider:

- `CodexProvider`

Future providers:

- local open-source coding agent
- remote coding agent
- custom internal worker

### Model Provider

The LLM provider should also be replaceable.

```ts
interface ModelProvider {
  generateStructured<T>(input: ModelRequest, schema: unknown): Promise<T>;
}
```

Possible providers:

- OpenAI
- OpenRouter
- Anthropic
- local model

Use the model provider for:

- intent routing
- summarization
- drafting
- ranking
- clarification questions

Do not use it as the authority for permissions or execution.

### Communication Provider

Slack should be one connector, not the whole communication model.

```ts
interface CommunicationProvider {
  listImportantMessages(input: ListMessagesInput): Promise<WorkMessage[]>;
  getThread(id: string): Promise<MessageThread>;
  draftReply(input: DraftReplyInput): Promise<DraftMessage>;
  sendApprovedDraft(draftId: string): Promise<void>;
}
```

Future providers:

- Slack
- Microsoft Teams
- Gmail
- iMessage through local automation if feasible

## Core Flow Examples

### Ask What Happened

```text
Input: "What happened yesterday?"
Intent: summarizeMorningBrief
Risk: read
Approval: not required
Action: summarize known work items
Output: spoken/written summary
```

### Start Codex

```text
Input: "Tell Codex to start with the failed CI."
Intent: startCodexTask
Risk: write
Approval: required
Action: create CodingTask and start through CodingAgentProvider
Output: task status
```

### Send A Message

```text
Input: "Reply to Sean saying I'll check the failure after standup."
Intent: draftMessage
Risk: draft
Approval: not required for draft
Action: create draft
Output: draft message card
```

```text
Input: "Send it."
Intent: sendApprovedMessage
Risk: write
Approval: required
Action: send through CommunicationProvider
Output: sent confirmation
```

### Unknown Request

```text
Input: "Do the thing from yesterday."
Intent: unknown
Risk: none
Approval: not applicable
Action: ask clarification
Output: "Which thing from yesterday: failed CI, PR review, or Sean's message?"
```

## Voice Is An Input, Not A Separate Brain

Voice should plug into the same pipeline:

```text
speech -> transcript -> intent router -> proposed action -> approval -> execution
```

Start with push-to-talk inside the dashboard.

Avoid always-listening, wake words, and autonomous background voice until the action system is mature.

## Audit Log

Every proposed or executed action should be logged.

Store:

- input text or transcript
- parsed intent
- selected capability
- approval result
- execution result
- timestamps
- provider used
- errors

The audit log is important because this app may eventually send messages, run coding tasks, open apps, and operate across personal/work systems.

## Design Principle

The LLM suggests.

The app verifies.

The user approves.

The connector acts.

The audit log remembers.

That is the core system.
