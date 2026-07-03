# Kabeer OS Chat Plan

Last updated: 2026-07-03

This file is the execution plan for adding a generic assistant chat loop to Kabeer OS.

The first useful version will only use GitHub read-only tools. The architecture must still be generic enough to later add Slack, Gmail, Calendar, Codex, local files, and other providers without rewriting the loop.

## Goal

Build a chat surface where the user can ask natural questions:

```text
What did I do on GitHub yesterday?
What issues are assigned to me in sfs-native?
Show PRs waiting on me.
What failed recently in kabeer-os?
```

The backend should run a controlled assistant loop:

```text
user message
-> model decision
-> validated capability call
-> observation
-> model decision
-> final answer / clarification / stop
```

The LLM should reason. The app should own tools, validation, permissions, execution, and audit.

## Non-Negotiable Rule

The LLM must never generate raw shell commands.

Bad:

```ts
execFile("gh", ["api", "..."])
```

Good:

```ts
{
  type: "call_capability",
  capability: "github.searchIssues",
  input: {
    repository: "deepusfs/sfs-native",
    assignee: "me",
    state: "open"
  }
}
```

The GitHub provider may internally translate that into an allowlisted `gh api` call. The model never sees or controls that command layer.

## Architecture Shape

```text
apps/web chat panel
  -> optional browser voice adapter
  -> POST /api/assistant/chat
  -> AssistantOrchestrator
  -> ModelProvider
  -> CapabilityRegistry
  -> Providers/connectors
  -> observations
  -> final assistant response
```

The orchestrator is generic. GitHub is only the first tool pack.

Browser voice mode is a UI adapter over this same route. It should produce a normal user message and consume a normal assistant response; it should not create a separate execution path. Server transcription may turn recorded audio into text before the assistant route runs.

Future shape:

```text
AssistantOrchestrator
  -> ModelProvider
      -> OpenRouterModelProvider
      -> OpenAIModelProvider
      -> LocalModelProvider
  -> CapabilityRegistry
      -> github.*
      -> slack.*
      -> gmail.*
      -> calendar.*
      -> codex.*
```

## Model Provider

OpenRouter is the first runtime model provider, but it should be replaceable.

Interface:

```ts
type ModelProvider = {
  generateStructured<TOutput>(input: {
    systemPrompt: string;
    messages: AssistantModelMessage[];
    schemaName: string;
    schema: unknown;
  }): Promise<TOutput>;
};
```

Initial implementation:

- `OpenRouterModelProvider` for real LLM calls from Phase 1.

Future implementations:

- `OpenAIModelProvider`
- `AnthropicModelProvider`
- `LocalModelProvider`

Automated tests can inject a fake `ModelProvider` directly. That test double should not become the product runtime path.

Suggested env:

```text
MODEL_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Later provider switch:

```text
MODEL_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

The orchestrator should only depend on `ModelProvider`, never OpenRouter directly.

## Assistant Decisions

The model must return one structured decision per loop step:

```ts
type AssistantDecision =
  | {
      type: "respond";
      message: string;
    }
  | {
      type: "call_capability";
      capability: CapabilityName;
      input: unknown;
    }
  | {
      type: "ask_user";
      question: string;
    }
  | {
      type: "stop";
      reason: string;
    };
```

The orchestrator validates the decision before doing anything.

If the model asks to call a capability:

1. Check capability exists.
2. Check capability is available.
3. Validate input with the capability input schema.
4. Check approval policy.
5. Execute through the registry.
6. Add the result as an observation.
7. Continue the loop.

## Loop Policy

Initial settings:

```ts
const maxSteps = 5;
const maxObservationChars = 6000;
const allowedCapabilities = [
  "github.searchRepositories",
  "github.searchIssues",
  "github.sync",
  "github.attentionSync",
  "github.dailySummary.generate",
];
```

Read-only GitHub capabilities can run without approval.

Anything write/draft/destructive should either be excluded from V1 or return a proposed action requiring approval.

The loop stops when:

- model returns `respond`
- model returns `ask_user`
- model returns `stop`
- max steps is reached
- capability validation fails
- capability execution fails

On max steps, return a graceful response:

```text
I gathered some information, but I hit the step limit before finishing. Here is what I found so far...
```

## V1 GitHub Tool Pack

We already have:

- `github.sync`
- `github.attentionSync`
- `github.dailySummary.generate`
- `github.searchRepositories`
- `github.searchIssues`

Possible next additions:

```text
github.searchPullRequests
github.getIssue
github.getPullRequest
github.getWorkflowFailures
```

V1 starts with:

```text
github.searchRepositories
github.searchIssues
```

That supports the first real chat example:

```text
What issues are assigned to me in sfs-native?
```

Expected loop:

```text
Step 1:
model -> github.searchRepositories({ query: "sfs-native" })

Observation:
deepusfs/sfs-native

Step 2:
model -> github.searchIssues({
  repository: "deepusfs/sfs-native",
  assignee: "me",
  state: "open"
})

Observation:
matching issues

Step 3:
model -> respond("You have ...")
```

If repository search is ambiguous:

```text
model -> ask_user("I found deepusfs/sfs-native and deepusfs/sfs-web. Which one?")
```

## Contracts To Add

Add `packages/contracts/src/assistant.ts`:

- `assistantMessageSchema`
- `assistantChatInputSchema`
- `assistantDecisionSchema`
- `assistantObservationSchema`
- `assistantStepSchema`
- `assistantChatResultSchema`

Initial request:

```ts
type AssistantChatInput = {
  message: string;
  history?: AssistantMessage[];
};
```

Initial response:

```ts
type AssistantChatResult = {
  message: string;
  steps: AssistantStep[];
  stoppedReason: "responded" | "asked_user" | "max_steps" | "error";
};
```

Each step should be inspectable for debugging:

```ts
type AssistantStep = {
  index: number;
  decision: AssistantDecision;
  observation?: {
    capability: CapabilityName;
    success: boolean;
    result?: unknown;
    error?: string;
  };
};
```

Add `packages/contracts/src/github.ts` contracts for:

- `githubRepositorySearchInputSchema`
- `githubRepositorySearchResultSchema`
- `githubIssueSearchInputSchema`
- `githubIssueSearchResultSchema`

## Server Files To Add

```text
apps/server/src/providers/model.ts
apps/server/src/providers/openrouter-model.ts
apps/server/src/services/assistant-orchestrator.ts
apps/server/src/routes/assistant.ts
```

Register route in:

```text
apps/server/src/index.ts
```

Extend:

```text
apps/server/src/capabilities/registry.ts
apps/server/src/providers/github.ts
```

## API Route

Add:

```text
POST /api/assistant/chat
```

Input:

```json
{
  "message": "What issues are assigned to me in sfs-native?",
  "history": []
}
```

Output:

```json
{
  "message": "You have 3 open issues assigned to you in deepusfs/sfs-native...",
  "steps": [],
  "stoppedReason": "responded"
}
```

## Frontend V1

Add a small chat panel to the dashboard:

- message list
- textarea
- send button
- loading state
- error state
- optional expandable "steps" debug view

Do not make this a full chat app yet. The first UI should be a practical command box for GitHub questions.

Suggested placement:

- below Daily Summary
- above detailed Activity Feed

## Prompting Rules

The system prompt should tell the model:

- You are the Kabeer OS assistant.
- You can only act by returning one valid decision.
- You cannot run shell commands.
- You cannot invent capability outputs.
- If you need data, call a capability.
- If repository/user/project names are ambiguous, ask the user.
- Use the smallest number of tool calls that can answer the question.
- Prefer read-only capabilities.
- Do not request write capabilities unless the user clearly asks for action.

The prompt should include available capabilities with:

- name
- description
- risk
- approval requirement
- input schema summary

## Approval Model

V1 exposes only read-only capabilities to chat, so no approval UI is needed yet.

Future behavior:

```text
model -> call_capability(codex.startTask)
orchestrator -> returns proposed action requiring approval
frontend -> shows approve/cancel
backend -> executes only after approval
```

The model must not be allowed to self-approve.

## Audit And Debugging

Every chat request should eventually record:

- user message
- model provider
- model name
- steps
- capabilities called
- approval decisions
- final response
- errors

For V1, keep this in response/debug output only. Persist audit logs later.

## Implementation Phases

### Phase 1: Contracts And OpenRouter Loop

Goal: prove the loop with the real OpenRouter runtime provider behind a generic `ModelProvider` interface.

Status: done. Assistant contracts, `ModelProvider`, `OpenRouterModelProvider`, `AssistantOrchestrator`, and `POST /api/assistant/chat` are implemented. Runtime uses OpenRouter when `OPENROUTER_API_KEY` is configured. Automated tests inject fake model providers and do not call the network.

Tasks:

- Add assistant contracts.
- Add `ModelProvider` interface.
- Add `OpenRouterModelProvider`.
- Add `AssistantOrchestrator`.
- Add `POST /api/assistant/chat`.
- Add env config for `MODEL_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_BASE_URL`.
- Add tests with an injected fake `ModelProvider` so automated tests do not call the network.
- Manually test the route with OpenRouter once env is configured.

Exit criteria:

- Route returns a final assistant message.
- Tests prove the orchestrator loops over model decisions.
- Local runtime can use OpenRouter from the start.
- The orchestrator still depends only on `ModelProvider`, not OpenRouter directly.

### Phase 2: GitHub Search Capabilities

Goal: answer repo-specific GitHub questions.

Status: done. `github.searchRepositories` and `github.searchIssues` are implemented as read-only capabilities. The provider translates them into allowlisted `gh api` calls and tests cover the repo-search-then-issue-search assistant loop.

Tasks:

- Add `github.searchRepositories`.
- Add `github.searchIssues`.
- Add provider support using allowlisted `gh api` paths.
- Add route/capability tests.
- Add orchestrator test where the injected fake model:
  - searches repos
  - searches issues
  - responds

Exit criteria:

- The backend can answer "what issues are assigned to me in sfs-native?" through the assistant loop.
- Ambiguous repo match can produce an `ask_user` decision.

### Phase 3: Dashboard Chat UI

Goal: make the loop usable from the app.

Status: done. The dashboard has an assistant chat panel below Daily Summary using shadcn `MessageScroller`, the web API client calls `POST /api/assistant/chat`, and assistant responses can show capability-step chips.

Tasks:

- Add dashboard chat panel.
- Add `sendAssistantMessage` API client.
- Render final answer.
- Render loading and errors.
- Optionally render expandable loop steps.

Exit criteria:

- User can type a GitHub question and receive a backend-generated answer.
- UI does not know GitHub command details.

### Phase 3.5: Browser Voice Chat Prototype

Goal: make the existing chat loop usable through a small push-to-talk browser voice flow.

Status: done. The dashboard assistant panel can record a short browser audio clip, transcribe it through `POST /api/voice/transcribe`, send the transcript through the same `POST /api/assistant/chat` route, and speak voice-mode responses with browser `speechSynthesis` when available. Browser speech recognition remains as fallback when recording is unavailable.

Tasks:

- Add browser recording and speech recognition detection.
- Add `VoiceTranscriptionProvider`.
- Add `POST /api/voice/transcribe`.
- Add voice start/stop controls to the assistant panel.
- Show recording/transcribing/transcript state.
- Send the transcript as a normal chat message.
- Speak the assistant response for voice-originated messages.
- Keep typed chat and voice chat on the same API route.

Exit criteria:

- The user can click voice, ask a GitHub question, stop voice, and get a spoken assistant answer.
- Voice does not bypass the assistant orchestrator, capability registry, or approval model.
- Audio is sent to the backend only for explicit user-recorded clips and is not stored.

### Phase 4: Model Provider Hardening

Goal: make the OpenRouter provider production-tolerable and keep the provider boundary ready for future swaps.

Tasks:

- Add timeout and retry policy.
- Parse and validate model JSON output.
- Add provider-level errors.
- Add clearer error messages for missing keys, bad model output, and upstream failures.
- Document how to switch to a later OpenAI/local provider.

Exit criteria:

- `MODEL_PROVIDER=openrouter` runs the same orchestrator loop.
- Invalid model output is rejected cleanly.
- Tests with injected fake providers still pass.

### Phase 5: Better Capability Context

Goal: make the model better at choosing tools.

Tasks:

- Add model-facing capability descriptions.
- Add examples per capability.
- Add schema summaries.
- Add observation summarization for large results.
- Add max result limits.

Exit criteria:

- The model reliably chooses search repos before search issues when repo name is vague.
- Large GitHub results do not blow up context.

### Phase 6: Generic Multi-Provider Expansion

Goal: prove the generic loop beyond GitHub.

Future tool packs:

- `slack.searchMessages`
- `gmail.searchMail`
- `calendar.listEvents`
- `codex.draftTask`

Exit criteria:

- The orchestrator code does not change when a new provider/tool pack is added.
- Only contracts, provider implementation, and capability registration change.

## First Test Prompts

Use these when testing:

```text
What did I do on GitHub yesterday?
What issues are assigned to me in sfs-native?
Find PRs that need my review.
What failed recently in kabeer-os?
Which repo did I work on the most?
```

## Risks

- Model returns invalid JSON.
- Model chooses unavailable capabilities.
- Model hallucinates repository names.
- Search results are too large.
- Ambiguous repo names need clarification.
- OpenRouter API failures should not break the app.

Mitigations:

- Validate every model decision with Zod.
- Keep a max-step limit.
- Keep capability allowlist per route/session.
- Use injected fake providers in tests.
- Ask the user when confidence is low or matches are ambiguous.

## Current Next Step

Start Phase 4.

Harden the OpenRouter provider with timeouts, clearer provider errors, and better handling for bad model output.
