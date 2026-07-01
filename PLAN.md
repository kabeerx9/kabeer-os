# Kabeer OS Plan

## North Star

Kabeer OS is a local personal operator that gets me from opening my laptop to meaningful work in under 30 seconds.

It should:

- show what changed since I last checked
- identify what needs my attention
- recommend the next few actions
- draft or start work only after approval
- use Codex as a replaceable coding worker, not as the whole product

## First Milestone: 30-Second Morning

Build the smallest useful loop:

1. Read GitHub work signals.
2. Normalize them into work items.
3. Rank what matters.
4. Show a morning dashboard.
5. Let me start one approved Codex task from a work item.

This is the first version because it proves the core product loop without Slack, Teams, iMessage, Calendar, or full desktop automation.

## Second Milestone: Voice Command Loop

After the GitHub + Codex loop works, add voice as the next motivational feature.

The goal is not full voice-controlled computer automation yet. The goal is a small voice loop that feels like the beginning of the futuristic version:

```text
Me: What happened yesterday?
App: GitHub had one failed workflow, two review requests, and one assigned issue.

Me: Tell Codex to start with the CI failure.
App: I found the failed workflow. I can start a Codex task with this context. Approve?
```

Voice should be treated as another input surface. It should not bypass the action and approval system.

### Voice V1 Capabilities

- Convert speech to text.
- Send the text to an LLM intent router.
- Classify the request into a known intent.
- Route the intent to an allowlisted backend action.
- Reply conversationally when no action is needed.
- Ask for approval before starting Codex or doing anything with side effects.

### Voice V1 Intents

Start with a small intent set:

```ts
type VoiceIntent =
  | {
      type: "summarize_morning_brief";
    }
  | {
      type: "explain_work_item";
      workItemHint: string;
    }
  | {
      type: "draft_codex_task";
      workItemHint: string;
    }
  | {
      type: "start_codex_task";
      workItemHint: string;
      requiresApproval: true;
    }
  | {
      type: "open_url";
      targetHint: string;
      requiresApproval: false;
    }
  | {
      type: "smalltalk_or_answer";
      response: string;
    }
  | {
      type: "unknown";
      clarificationQuestion: string;
    };
```

The LLM should return structured intent data. The backend should validate it before doing anything.

### Voice Safety Rule

The voice flow must follow this rule:

```text
voice -> transcript -> LLM intent -> app validation -> approval if needed -> action
```

The LLM can suggest what to do. It cannot directly run commands, send messages, edit files, or start Codex without going through the app action system.

### Voice Non-Goals

- No always-listening background assistant at first.
- No wake word.
- No autonomous message sending.
- No arbitrary terminal commands.
- No controlling random desktop apps.
- No multi-app automation until the GitHub + Codex flow is stable.

Use a push-to-talk button in the dashboard first. Always-listening can come much later.

## V0 Scope

### Data Sources

- GitHub via the `gh` CLI.
- Local repo metadata where needed.

### Signals

- PRs requesting my review.
- Issues assigned to me.
- Failed GitHub Actions workflows.
- Recently updated PRs/issues that mention me.

### UI

- Local web dashboard in `apps/web`.
- Dashboard sections:
  - Morning summary
  - Important work items
  - Recommended actions
  - Codex task launcher

### Backend

- Local Fastify server in `apps/server`.
- Server runs allowlisted local commands only.
- No arbitrary terminal command execution from the browser.

### Storage

- Start with a simple local JSON file or SQLite.
- Store:
  - last sync time
  - seen work item IDs
  - generated recommendations
  - started Codex tasks
  - action/audit history

## Non-Goals For V0

- No Slack integration.
- No Microsoft Teams integration.
- No Gmail or Calendar integration.
- No iMessage automation.
- No mobile app.
- No autonomous sending of messages.
- No fully generic agent framework.
- No hosted SaaS version.
- No trying to control the whole computer.

## Architecture Shape

The app should be a local agent with a web dashboard:

```text
Browser dashboard
  -> local API server
  -> connectors / providers
  -> GitHub, Codex, local storage
```

The browser should ask for high-level actions:

```text
github.sync
codex.startTask
codex.cancelTask
workItem.markDone
```

The browser should never send arbitrary shell commands.

## Core Domain Models

Use generic names so Slack, Teams, Calendar, and other systems can be added later without rewriting the dashboard.

```ts
type WorkItem = {
  id: string;
  source: "github";
  kind: "review_request" | "assigned_issue" | "failed_workflow" | "mention";
  title: string;
  summary: string;
  url?: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};
```

```ts
type RecommendedAction = {
  id: string;
  workItemId: string;
  label: string;
  reason: string;
  actionType: "open_url" | "start_codex_task" | "mark_seen";
};
```

```ts
type CodingTask = {
  id: string;
  title: string;
  repoPath?: string;
  goal: string;
  context: string[];
  constraints: string[];
  verificationCommands: string[];
  permissions: {
    canEditFiles: boolean;
    canRunCommands: boolean;
    canPush: boolean;
    canOpenPR: boolean;
  };
};
```

## Provider Boundary

Codex should be behind a provider interface from the beginning:

```ts
interface CodingAgentProvider {
  startTask(task: CodingTask): Promise<AgentRun>;
  cancelRun(runId: string): Promise<void>;
}
```

The first implementation can call Codex through the simplest working path:

1. Codex SDK or app-server if practical.
2. Codex CLI as a fallback.
3. Manual prompt generation if the integration takes too long.

The dashboard should not care which provider runs the coding task.

## Tomorrow Execution Plan

### Step 1: Decide What To Keep From The Starter

- Keep `apps/web`.
- Keep `apps/server`.
- Keep `packages/contracts`.
- Keep `packages/ui`.
- Ignore `apps/native`.
- Avoid Clerk/Postgres unless they are required just to boot the app.

Outcome: a clear repo direction for V0.

### Step 2: Make The App Run Locally

- Start the server.
- Start the web app.
- Confirm the browser can call the API.
- Remove or bypass starter-only blockers if needed.

Outcome: a working local dashboard shell.

### Step 3: Add The First Backend Route

Add:

```text
GET /api/morning-brief
```

Return mocked data first:

- 1 review request
- 1 assigned issue
- 1 failed workflow
- 2 recommended actions

Outcome: UI can be built without GitHub API complexity.

Status: done. The endpoint returns a mocked typed morning brief with three GitHub work items and two recommended actions.

### Step 4: Build The First Dashboard

Replace the starter dashboard with:

- greeting
- work summary
- important items list
- recommended action list
- disabled or mocked "Start Codex Task" button

Outcome: the product feels real before integrations are wired.

### Step 5: Wire GitHub Read-Only Sync

Use `gh` CLI from the local server to fetch:

- review requests
- assigned issues
- failed workflows

Start with read-only commands.

Outcome: the dashboard shows real GitHub data.

### Step 6: Add Local Persistence

Store:

- last sync timestamp
- seen work item IDs
- last generated brief

Start with JSON if faster; move to SQLite when the shape stabilizes.

Outcome: the app can say what changed since the last run.

### Step 7: Add Codex Task Drafting

For a selected work item, generate a `CodingTask` object and show the prompt/context before running anything.

Outcome: approval-first workflow exists.

### Step 8: Start One Codex Task

Add a backend action:

```text
POST /api/codex/start-task
```

It should:

- accept a known `CodingTask`
- run only through the `CodingAgentProvider`
- log the action
- return task status

Outcome: first end-to-end loop works.

### Step 9: Add Push-To-Talk Prototype

Add a button in the dashboard:

```text
Hold to talk
```

For the first pass:

- Use browser speech recognition if it is good enough.
- Otherwise record audio and send it to a speech-to-text provider later.
- Display the transcript before taking action.

Outcome: voice becomes an input, but nothing executes yet.

### Step 10: Add LLM Intent Routing

Add an LLM provider interface:

```ts
interface ModelProvider {
  generateStructured<T>(input: ModelRequest, schema: Schema<T>): Promise<T>;
}
```

Use it to map transcripts into `VoiceIntent`.

The app should support simple commands like:

- "What happened yesterday?"
- "What should I do first?"
- "Tell Codex to start with the failed CI."
- "Explain the first work item."

Outcome: voice can trigger known product flows.

### Step 11: Add Approval Before Action

When voice maps to a side-effecting intent, show an approval card:

```text
Intent: Start Codex task
Work item: Failed CI on repo X
Prompt: ...

[Approve] [Cancel]
```

Outcome: voice feels powerful without becoming unsafe.

## Success Criteria

V0 is successful when I can open the dashboard and answer these questions in under 30 seconds:

- What needs my attention?
- What changed since last time?
- What should I do first?
- Can I start the right coding task without rewriting context manually?

The next milestone is successful when I can use push-to-talk to ask:

- "What happened yesterday?"
- "What should I do first?"
- "Tell Codex to start with that."

And the app responds or prepares the correct approved action.

## Principle

Do not build the automation OS yet.

Build one reliable automation loop:

```text
signal -> work item -> recommendation -> approval -> worker -> result
```

After that loop works for GitHub + Codex, repeat it for Slack, Teams, Calendar, and other systems.
