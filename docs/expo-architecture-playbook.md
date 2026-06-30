# Expo Architecture Playbook

Reusable patterns from this app for future Expo and React Native projects.

Last reviewed: 2026-06-25.

## Purpose

This is a portable engineering guide, not a Shotgun-specific product spec. It captures the parts of this app worth carrying into a new Expo project: startup, route protection, data fetching, feature ownership, realtime state, notifications, external payment returns, compliance-style preflights, testing, and release safety.

Use it as a project starter checklist and as a standard for future app architecture reviews.

## The Short Version

Carry these ideas forward:

- Keep `app/` route files thin. Routes compose feature screens and wire navigation, but domain behavior lives in `features/`.
- Centralize startup in `core/bootstrap`, runtime config in `core/config`, and provider composition in `core/providers`.
- Fail closed when required runtime config is missing. Show a readable error screen instead of silently falling back.
- Use feature folders with `api.ts`, `keys.ts`, `queries.ts`, `mutations.ts`, `types.ts`, plus optional `components`, `hooks`, `store`, `storage`, `utils`, and `__tests__`.
- Use TanStack Query option factories. Components call `useQuery(featureQueries.something())`, not hand-built keys and functions.
- Keep query freshness policy centralized instead of scattering `staleTime` numbers everywhere.
- Treat server state, client state, realtime state, and durable local state as different tools.
- Put high-risk workflows behind typed controller hooks or workflow functions that own guards, API calls, navigation, invalidation, and outcomes.
- Keep notification setup at the app root, with payload-driven tap routing in one place.
- Keep route names and route builders centralized in `navigation/routes.ts`.
- Reset session state on sign-out or user switch.
- Add tests first around pure logic and state transitions, especially for money, KYC, geo, responsible gaming, auth, realtime, and draft-like flows.

## Reference Map

These files are the best examples in this repo:

- Startup: [`core/bootstrap/app-startup.ts`](../core/bootstrap/app-startup.ts)
- Runtime config: [`core/config/env.ts`](../core/config/env.ts)
- Runtime config error screen: [`core/bootstrap/RuntimeConfigErrorScreen.tsx`](../core/bootstrap/RuntimeConfigErrorScreen.tsx)
- Provider tree: [`core/providers/AppProviders.tsx`](../core/providers/AppProviders.tsx)
- Root layout and route guards: [`app/_layout.tsx`](../app/_layout.tsx)
- Access-state derivation: [`hooks/useAppAccess.ts`](../hooks/useAppAccess.ts)
- Return navigation: [`navigation/authFlow.ts`](../navigation/authFlow.ts), [`navigation/pendingReturnTo.ts`](../navigation/pendingReturnTo.ts)
- Route constants/builders: [`navigation/routes.ts`](../navigation/routes.ts)
- Query client: [`lib/queryClient.ts`](../lib/queryClient.ts)
- Query policy: [`features/query-policy.ts`](../features/query-policy.ts)
- Feature-folder guide: [`docs/feature-folder-architecture.md`](./feature-folder-architecture.md)
- Data fetching guide: [`docs/data-fetching.md`](./data-fetching.md)
- Notifications: [`features/notifications/`](../features/notifications), [`docs/notifications.md`](./notifications.md)
- Payment checkout controller: [`features/payments/hooks/useSoapCheckout.ts`](../features/payments/hooks/useSoapCheckout.ts)
- Compliance prelude: [`features/compliance/utils/runMoneyMovementPrelude.ts`](../features/compliance/utils/runMoneyMovementPrelude.ts)
- Contest join workflow: [`features/contests/hooks/useJoinContestFlow.ts`](../features/contests/hooks/useJoinContestFlow.ts), [`features/contests/utils/joinFlow.ts`](../features/contests/utils/joinFlow.ts)
- Realtime draft state: [`features/draft-room/hooks/useDraftRoom.ts`](../features/draft-room/hooks/useDraftRoom.ts), [`features/draft-room/store/draftRoomStore.ts`](../features/draft-room/store/draftRoomStore.ts)
- Live scoring store/subscriber: [`components/realtime/LiveScoringSubscriber.tsx`](../components/realtime/LiveScoringSubscriber.tsx), [`features/games/store/live-scoring-store.ts`](../features/games/store/live-scoring-store.ts)
- App config release gate: [`features/app-config/components/AppConfigGate.tsx`](../features/app-config/components/AppConfigGate.tsx)
- Observability: [`observability/sentry.ts`](../observability/sentry.ts)
- Testing strategy: [`docs/testing-strategy.md`](./testing-strategy.md)

## Recommended Project Shape

Start new apps with this layout:

```txt
app/
  _layout.tsx
  (auth)/
  (onboarding)/
  (tabs)/
  (drawer)/              # only if the app really uses a drawer
  (sheets)/              # modal/sheet routes

api/
  api.ts                 # primary backend client
  public-api.ts          # unauthenticated backend client, if needed
  index.ts               # exports named clients

components/
  Button.tsx
  Text.tsx
  Input.tsx
  EmptyState.tsx
  sheets/
  select/
  realtime/              # app-shell realtime subscribers only

core/
  bootstrap/
  config/
  constants/
  providers/
  storage/

features/
  auth/
  app-config/
  notifications/
  profile/
  <domain>/

hooks/
  useAppAccess.ts
  useAppLifecycle.ts
  useDeepLinks.ts
  useResetSessionOnAuthChange.ts

lib/
  queryClient.ts
  realtimeClient.ts

navigation/
  routes.ts
  authFlow.ts
  pendingReturnTo.ts

observability/
  sentry.ts

theme/
  colors.ts
  typography.ts
  spacing.ts

utils/
  cn.ts
```

Keep this split strict:

- `app/` is routing and composition.
- `core/` is app bootstrap and infrastructure.
- `features/` owns domains.
- `components/` is shared primitives and app-wide building blocks.
- `api/` owns transport concerns.
- `lib/` owns configured singleton clients.
- `navigation/` owns route names, builders, and safe return-path helpers.

## Bootstrap Pattern

Use a small root startup module that runs once before the root component mounts providers.

Good pattern from this app:

```ts
initializeAppStartup();

function RootLayout() {
  if (missingRequiredRuntimeConfig.length > 0) {
    return <RuntimeConfigErrorScreen missingKeys={missingRequiredRuntimeConfig} />;
  }

  return (
    <AppProviders>
      <RootLayoutNav />
    </AppProviders>
  );
}
```

What belongs in startup:

- Sentry or crash reporting initialization.
- Splash screen hold/hide control.
- Dev-only tooling, imported dynamically.
- Notification handler initialization.

What should not belong there:

- Feature data fetching.
- Navigation decisions.
- Auth-dependent side effects.
- Business workflows.

## Runtime Config

Copy this approach:

- Parse env values once in `core/config/env.ts`.
- Trim strings and parse booleans/sample rates with helpers.
- Export `missingRequiredRuntimeConfig`.
- Export `getRequiredEnvValue(value, envName)` for singleton clients.
- Show a clear error screen when required config is missing.

Required config should fail closed. This is especially important for:

- Auth publishable keys.
- API base URLs.
- Realtime keys.
- Sentry DSNs when enabled.
- Payment, KYC, compliance, geo, or other regulated providers.

Avoid silent fallbacks like "if production URL is missing, use test URL." If a dev bypass exists, make it explicit and named, for example `EXPO_PUBLIC_BYPASS_GEO_VALIDATION`, and keep it local-dev only.

## Provider Tree

Centralize providers in `core/providers/AppProviders.tsx`.

The current app layers providers like this:

```txt
ClerkProvider
  QueryClientProvider
    AblyProvider
      GestureHandlerRootView
        BottomSheetModalProvider
          AppConfigGate
          GeoRestrictionSheetProvider
          app-wide realtime subscribers
          LogoutConfirmationProvider
            DepositSheetProvider
              children
```

This is useful because:

- Root layout stays readable.
- Provider order is documented in code.
- App-wide gates and subscribers mount exactly once.
- Domain providers can be removed or replaced without touching routes.

Rule of thumb:

- Auth provider should be high in the tree.
- Query provider should wrap any hook that can fetch.
- Realtime provider should wrap subscribers and realtime feature hooks.
- Gesture and bottom-sheet providers should wrap all sheet users.
- Feature providers should only be root-level if they coordinate global app behavior.

## App Access And Protected Routes

This app has a strong pattern for route protection:

1. Fetch the minimum profile/bootstrap data needed to decide access.
2. Convert auth/profile/loading/error state into a pure access state.
3. Derive booleans like `canAccessMainApp`, `canAccessAuth`, `canAccessOnboarding`.
4. Pass those booleans into `Stack.Protected` and `Drawer.Protected`.

Example shape:

```ts
const {
  canAccessAppShell,
  canAccessMainApp,
  canAccessAuth,
  canAccessOnboarding,
  canAccessKyc,
} = useAppAccess({ isLoaded, isSignedIn });

return (
  <Stack>
    <Stack.Protected guard={canAccessAppShell}>
      <Stack.Screen name="(drawer)" />
    </Stack.Protected>

    <Stack.Protected guard={canAccessAuth}>
      <Stack.Screen name="(auth)" />
    </Stack.Protected>

    <Stack.Protected guard={canAccessOnboarding}>
      <Stack.Screen name="(onboarding)" />
    </Stack.Protected>
  </Stack>
);
```

Carry this forward because it avoids scattered redirects. The route tree says which group is allowed, and `useAppAccess` owns the decision.

For future apps, keep the access-state function pure and testable:

```ts
export function deriveAppAccessState(input: AppAccessInput): AppAccessState {
  if (!input.isLoaded) return 'auth_loading';
  if (!input.isSignedIn) return 'guest';
  if (input.hasProfileError) return 'profile_error';
  if (input.isProfileBootstrapPending) return 'profile_loading';
  return input.hasProfileCompleted ? 'ready' : 'profile_required';
}
```

## Return Paths, Deep Links, And Navigation Safety

Centralize route constants and route builders:

```ts
export const appRoutes = {
  root: '/',
  login: '/login',
  drawer: {
    tabs: {
      home: '/(drawer)/(tabs)',
      lobby: '/(drawer)/(tabs)/lobby',
    },
  },
} as const;

export const routeBuilders = {
  login: (returnTo?: string) =>
    returnTo ? { pathname: appRoutes.login, params: { returnTo } } : appRoutes.login,
};
```

For return paths:

- Only accept paths that start with `/`.
- Reject root, auth routes, and unknown unsafe paths.
- Store pending return paths in MMKV when auth or onboarding interrupts a flow.
- Consume and clear the path after the user can access the main app.

This is useful for:

- Private contest invite links.
- KYC returns.
- Payment returns.
- Auth confirmation links.
- Any flow where the user starts outside the signed-in app shell.

## Data Fetching

Use TanStack Query v5 with feature-owned option factories.

Each feature should usually have:

```txt
features/<feature>/
  api.ts
  keys.ts
  queries.ts
  mutations.ts
  types.ts
```

Recommended contracts:

- `api.ts` does raw HTTP calls and returns `res.data`.
- `keys.ts` exports stable key factories.
- `queries.ts` exports `queryOptions` and `infiniteQueryOptions`.
- `mutations.ts` exports mutation option factories or workflow hooks.
- Components import query options instead of rebuilding query keys.

Example:

```ts
export const profileQueries = {
  me: (enabled = true) =>
    queryOptions({
      queryKey: profileKeys.me(),
      queryFn: profileApi.me,
      staleTime: queryStaleTime.volatile,
      refetchOnWindowFocus: queryRefetchOnFocus.whenStale,
      enabled,
    }),
};
```

Component usage:

```ts
const { data: profile } = useQuery(profileQueries.me(isLoaded && isSignedIn));
```

Why this works:

- Keys become a single source of truth.
- Invalidations are predictable.
- Components stay focused on rendering.
- Query options can encode product-specific freshness rules.
- Data fetching stays portable across screens.

## Query Policy

Keep query lifetimes named:

```ts
export const queryStaleTime = {
  realtime: 0,
  volatile: 30_000,
  feed: 60_000,
  session: 5 * 60_000,
  static: 24 * 60 * 60 * 1000,
} as const;
```

Use names based on product behavior:

- `realtime`: data changes through socket events or needs fresh snapshots.
- `volatile`: wallet, profile gates, active contests, status screens.
- `feed`: news, activity, paginated profile stats.
- `session`: templates, mostly stable lists, app config.
- `static`: rules, copy, local metadata, rarely changing content.

This makes reviews easier because a query's freshness policy explains intent.

## API Clients And Auth Tokens

The app uses a useful pattern:

- `service/auth-service.ts` stores a current `getToken` function.
- React wires the token function from Clerk at the root.
- Axios clients call `authService.getToken()` without importing React hooks.
- Each backend client owns base URL, timeout, request metadata, auth header, and error normalization.

Use separate clients when backends have different behavior:

```txt
api/
  api.ts              # main Django/backend client
  public-api.ts       # unauthenticated public endpoints
  engine.ts           # draft or realtime engine backend
  contest-engine.ts   # contest-engine backend
  index.ts            # named exports
```

Transport rules:

- Normalize backend errors at the client boundary.
- Prefer server-provided error codes/messages when safe.
- Convert network and timeout errors into user-readable errors.
- Do not let components parse raw axios errors.
- Do not hide missing production config by falling back to test infrastructure.

## Runtime Validation

Use TypeScript across the whole app, and use runtime validation at untrusted boundaries.

TypeScript checks the code you write. It does not prove that backend JSON, deep-link params, notification payloads, persisted MMKV values, or realtime socket events have the shape your types claim. For the next app, install Zod from day one and use it selectively where outside data enters the app.

Validate these boundaries:

- Backend API responses for volatile or high-risk domains.
- Remote app config and feature flags.
- Deep-link and return-route params.
- Notification payloads.
- Realtime socket payloads.
- Payment, KYC, geo, and compliance provider responses.
- Persisted local data when a bad shape can break app behavior.

Do not duplicate TypeScript types by hand. Define the schema and infer the type:

```ts
import { z } from 'zod';

export const profileSchema = z.object({
  user_data: z.object({
    profile_completed: z.boolean(),
  }),
});

export type Profile = z.infer<typeof profileSchema>;
```

Parse in the feature API file before TanStack Query stores the result:

```ts
export const profileApi = {
  me: async () => {
    const res = await api.django.get('user/me/');
    return profileSchema.parse(res.data);
  },
};
```

Use a helper so parse failures are logged consistently and surfaced as normal app errors:

```ts
export function parseApiData<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.warn(`[api] invalid ${label} response`, parsed.error.flatten());
    throw new Error(`Invalid ${label} response`);
  }

  return parsed.data;
}
```

Guideline:

- TypeScript everywhere.
- Zod at the edges.
- Runtime validation first for money, KYC, geo, responsible gaming, auth/profile gates, app config, notification taps, and realtime events.
- Avoid schema busywork for static UI-only objects that never cross a trust boundary.

## Production Essentials

These are the production pieces worth wiring early. Keep them small and boring; the goal is reliability, not platform engineering.

### Normalized API Errors

Every backend client should throw one predictable app error shape:

```ts
export type AppApiError = {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
};
```

Use this at the transport boundary so screens and workflow hooks can switch on `code` instead of parsing random strings. This matters for KYC required, insufficient funds, geo blocked, auth expired, validation errors, contest full, and provider downtime.

Rules:

- Normalize axios/provider errors once in the API client.
- Preserve server `code` and safe `message` when available.
- Convert network and timeout failures into stable codes like `NETWORK_ERROR` and `REQUEST_TIMEOUT`.
- Do not leak raw provider payloads into UI or logs if they may contain sensitive data.

### Remote Config And Kill Switches

Mobile clients live longer than backend deploys. Add a small remote config endpoint before public beta, even if it starts simple.

Minimum useful config:

```ts
type RemoteAppConfig = {
  minSupportedBuild: number;
  latestBuild: number;
  maintenanceMode?: boolean;
  disabledFeatures?: {
    deposits?: boolean;
    withdrawals?: boolean;
    contestJoin?: boolean;
    kyc?: boolean;
  };
};
```

Use it for:

- Force update when old builds are unsafe.
- Soft update when a newer build exists.
- Maintenance mode during backend incidents.
- Product-specific kill switches for money movement, contest joins, KYC, or realtime features.

Keep the surface area small. Do not build a huge feature flag system until the product needs one.

### Observability With Context

Install crash/error monitoring before launch, and attach useful context:

- App version, build number, platform, Expo channel, runtime version, update ID.
- User id after auth, cleared on logout.
- Access state: guest, onboarding, ready, profile error.
- Current high-risk phase: checkout, KYC, geo validation, contest join, realtime room.
- Normalized API error code and status.

Do not send secrets, tokens, full provider payloads, precise location, or unnecessary PII to logs, Sentry, analytics, PRs, or screenshots.

### Idempotency And Duplicate Protection

Production users double tap, retry, background the app, reopen from notifications, and receive duplicate realtime events.

Guard critical flows:

- Disable or lock buttons while mutations are in flight.
- Use a ref/store guard for one active operation when needed.
- Make realtime reducers idempotent and ignore duplicate events.
- Deduplicate notification taps.
- Use backend idempotency keys for money movement or other non-repeatable mutations when the backend supports them.

Client-side guards improve UX. Backend idempotency is still the real safety net for money and irreversible actions.

### Safe Navigation And External Returns

All external entry points need allowlisting:

- Deep links.
- Auth return URLs.
- Payment/KYC return URLs.
- Notification tap routes.
- `returnTo` params.

Only navigate to known in-app routes. Reject external URLs, auth routes, root, and malformed paths unless explicitly supported.

### Release And Update Discipline

For Expo apps, decide what can ship OTA and what needs a native build.

Minimum release discipline:

- Use a stable `runtimeVersion` policy.
- Keep remote app config aligned with submitted native builds.
- Run typecheck, lint errors, tests, and `git diff --check`.
- Smoke test auth, onboarding/profile gate, payment/KYC/geo if present, notifications if present, and realtime if present.
- Have a rollback or kill-switch plan for critical flows.

This is not optional for production mobile. Users can stay on old native builds for weeks.

## Global Query Client

Keep one configured `QueryClient` in `lib/queryClient.ts`.

Good defaults from this app:

- Queries retry a small number of times.
- Mutations do not retry by default.
- Reconnect refetch is enabled.
- Window-focus refetch is disabled globally, then enabled per feature where useful.
- Mutation success/error toasts are centralized through mutation `meta`.
- Query error toasts are opt-in through query `meta`.

This prevents every screen from inventing its own toast behavior.

## State Ownership

Use each tool for the right type of state:

| State type | Preferred owner |
|------------|-----------------|
| Server data | TanStack Query |
| Form-local state | React state or form library |
| Cross-screen client state | Zustand feature store |
| Realtime merged state | Zustand feature store plus query snapshot |
| Durable small local state | MMKV |
| Secrets/tokens | Auth provider secure token cache |

Put stores near the domain:

```txt
features/draft-room/store/draftRoomStore.ts
features/games/store/live-scoring-store.ts
features/wallet/store/wallet-store.ts
features/notifications/store/notification-store.ts
```

Only keep a top-level `store/` entry when it is truly app-shell state with no feature owner.

## Session Reset

Keep one hook that clears cross-feature state when a user signs out or switches accounts.

This app resets:

- Query cache.
- Chat messages.
- Draft room state.
- Games/live scoring state.
- Presence.
- Wallet.
- Pending return path.
- KYC/compliance session cache.
- Notification data and scheduled local notifications.

Carry this forward. Bugs from stale state after user switch are subtle and expensive.

## Realtime State

The app has two good realtime patterns.

For global live scoring:

- Mount one root subscriber.
- Normalize incoming events into a store.
- Filter updates to known IDs so unrelated global events do not grow memory or update irrelevant UI.

For draft-room style state:

- Fetch an HTTP snapshot through TanStack Query.
- Hydrate a Zustand store from that snapshot.
- Subscribe to realtime channel in a feature hook.
- Apply events through store actions.
- Use a `sessionKey` so late events from an old room/session are ignored.
- Merge snapshots and events without duplicating picks/events.
- Keep derived fields in one place.

This pattern works for:

- Draft rooms.
- Live auctions.
- Collaborative boards.
- Order tracking.
- Chat rooms.
- Sports live scoring.

Rule: realtime event handlers should be small. They should parse the event and call a store action. The store should own transition logic.

## Notifications

The notification architecture is worth reusing:

```txt
root bootstrap hook
  -> notification store
  -> permission/token handling
  -> scheduler hooks
  -> payload intent parser
  -> centralized tap navigation
```

Carry these rules forward:

- Register notification listeners once at the app root.
- Request permission only after the user can access the main app.
- Store permission state and Expo push token in a notification store.
- Save tokens per user if local persistence is needed.
- Clear tokens and local scheduled notifications on logout.
- Route taps based on `notification.request.content.data`, not title or body text.
- Queue notification responses until auth and root navigation are ready.
- Deduplicate notification responses.
- Clear consumed last notification responses.

Good payload shape:

```ts
{
  type: 'draft_reminder',
  screen: 'draft_room',
  reminder: 'draft_start',
  draftId: 123,
  contestId: 123,
  userContestId: 456,
}
```

The important idea is intent-based navigation. Backend and local notifications should use the same payload contract.

## Workflow Hooks For High-Risk Flows

For money, KYC, geo, responsible gaming, auth, and contest joins, avoid spreading logic across screens.

Use a workflow hook or pure workflow function that returns typed outcomes:

```ts
export type JoinContestOutcome =
  | { type: 'joined'; contestId: number; transactionId?: string }
  | { type: 'busy'; contestId: number }
  | { type: 'kyc_required'; contestId: number; message: string }
  | { type: 'insufficient_funds'; contestId: number; message: string }
  | { type: 'geo_blocked'; contestId: number; result: GeoBlockedResult }
  | { type: 'failed'; contestId: number; message: string };
```

The hook can own:

- Busy guards.
- Responsible-gaming preflight.
- Geo validation.
- KYC checks.
- API call.
- Error-code mapping.
- Cache invalidation.
- Navigation decision hints.

The component only decides how to present the outcome.

This is one of the best architecture ideas in the app.

## Compliance And Money Movement

The app's money movement prelude is a strong template:

```txt
KYC sync if needed
  -> location permission and GPS
  -> fresh device ping / geo validation
  -> checkout/session creation
  -> WebView external flow
  -> return route
  -> settlement polling and profile invalidation
```

Rules to reuse:

- Fail closed when KYC or geo cannot be verified.
- Keep local dev bypasses explicit.
- Do not open deposit/withdraw sheets until auth and profile are ready.
- Save a small return snapshot before sending the user into an external flow.
- Use a dedicated return route for external providers.
- Poll/invalidate critical profile or wallet queries after return.
- Keep the UI controller hook separate from the sheet component.

## App Config And Release Gates

This app has a reusable remote app-config pattern:

- Backend returns platform-specific config.
- Client validates basic shape before acting.
- `minSupportedBuild` creates a force-update gate.
- `latestBuild` creates a soft-update prompt.
- `whatsNew` shows one-time release notes.
- Seen build is stored locally in MMKV.

Use this in future apps when:

- Mobile builds need to be retired safely.
- Backend contracts can become incompatible.
- Payment, KYC, compliance, or location behavior changes.
- You need TestFlight/internal update prompts before store launch.

Keep release copy short and avoid force updates unless older builds are unsafe.

## UI System

This app keeps a good split:

- Shared UI primitives live in `components/`.
- Domain-specific UI lives under `features/<feature>/components/`.
- Tokens live in `theme/`.
- Class composition uses `cn` with NativeWind and `tailwind-merge`.
- Components like `Button` and `ThemedText` encode variants instead of repeating raw styles everywhere.

Carry forward:

- `Button` with `variant`, `size`, `label`, `disabled`, and class overrides.
- `ThemedText` with typography variants and semantic colors.
- Central `colors.ts`, `typography.ts`, `spacing.ts`.
- Generic shared sheet/select/input primitives.
- Feature UI colocated with feature logic.

Avoid:

- Putting feature-specific cards/sheets in top-level `components/`.
- Letting route files grow into full screen implementations.
- Copying token values into random files.
- Adding abstractions before reuse is real.

## Feature Folder Rules

Small feature:

```txt
features/news/
  api.ts
  keys.ts
  queries.ts
  types.ts
```

Large feature:

```txt
features/<feature>/
  api.ts
  keys.ts
  queries.ts
  mutations.ts
  types.ts
  constants.ts
  components/
  hooks/
  store/
  storage/
  utils/
  __tests__/
```

Rules:

- Do not create empty folders.
- Keep route files thin.
- Keep API/query files at the feature root.
- Move feature-only helpers into `utils/`.
- Move feature-only UI into `components/`.
- Move feature-only hooks into `hooks/`.
- Keep tests near the feature.
- If ownership is unclear, leave the file shared and document the ambiguity.

## Testing Strategy

Use tests where they buy confidence:

1. Pure helpers and policy functions.
2. Store/state transitions.
3. Workflow functions with typed outcomes.
4. Focused component integration tests.
5. A small number of end-to-end smoke tests for critical flows.

High-value examples from this app:

- `deriveAppAccessState` route gating.
- `getSafeAuthReturnTo` and return-path parsing.
- Deposit/withdraw amount parsing.
- Money movement eligibility.
- KYC callback status mapping.
- Responsible-gaming policy.
- Contest join outcomes.
- Draft pick submission and roster helpers.
- Draft room store transitions and duplicate-event handling.
- App config decision derivation.
- Wallet mapping.

Required local gate before PRs in this repo:

```bash
pnpm typecheck
pnpm lint:errors
pnpm test:once
git diff --check
```

For future apps, keep the same spirit even if command names differ.

## Observability

The Sentry setup is worth copying conceptually:

- Initialize once from startup.
- Set environment, release, dist, runtime version, update ID, and app ownership tags.
- Drop expected/user-actionable errors before sending.
- Set and clear Sentry user on auth changes.
- Add contexts for route gates and high-risk state.
- Use dev logs in realtime flows, but keep production noise low.

Useful contexts to add in future apps:

- Auth/access state.
- Profile/onboarding gate state.
- Payment or checkout phase.
- KYC/geo decision state.
- Realtime room ID/session key.
- App config decision.
- Current Expo Updates channel/runtime.

## New Feature Checklist

When adding a feature to a new app:

1. Create `features/<feature>/types.ts`.
2. Add raw HTTP calls in `api.ts`.
3. Add query keys in `keys.ts`.
4. Add `queryOptions` in `queries.ts`.
5. Add mutation factories or a workflow hook in `mutations.ts` or `hooks/`.
6. Put feature-only UI in `components/`.
7. Put pure logic in `utils/`.
8. Add Zod schemas for untrusted inputs and high-risk backend responses.
9. Define expected API error codes for risky mutations.
10. Add duplicate-submit protection for non-repeatable actions.
11. Add focused tests for pure logic and risky state transitions.
12. Add route files under `app/` that compose feature components.
13. Add route constants/builders in `navigation/routes.ts` if screens need programmatic navigation.
14. Decide query freshness using `features/query-policy.ts`.
15. Add invalidations using feature key factories.

## New App Bootstrap Checklist

Use this when starting another Expo app:

1. Set up TypeScript, Expo Router, path alias `~/`, ESLint, Jest, and NativeWind if needed.
2. Add `core/config/env.ts` with required config validation.
3. Add `core/bootstrap/app-startup.ts`.
4. Add `core/providers/AppProviders.tsx`.
5. Add `lib/queryClient.ts`.
6. Add Zod and a small `parseApiData` helper for untrusted boundary validation.
7. Add normalized API errors in the transport layer.
8. Add `api/` clients and an auth token service.
9. Add `navigation/routes.ts` and safe return-path helpers.
10. Add `hooks/useAppAccess.ts`.
11. Add `hooks/useResetSessionOnAuthChange.ts`.
12. Add `hooks/useAppLifecycle.ts`.
13. Add `features/query-policy.ts`.
14. Add `theme/` tokens and basic `Button`, `Text`, `Input`, `EmptyState`.
15. Add remote app config with minimum build, maintenance mode, and only the kill switches the product needs.
16. Add notification bootstrap only when notification behavior is real.
17. Add realtime singleton/subscriber only when there is a real realtime domain.
18. Add Sentry/observability early, before launch pressure.
19. Add the full verification gate to package scripts.

## Things To Improve In The Next App

These are useful additions beyond the current implementation:

- Add MSW or equivalent mocked network handlers for component/workflow tests.
- Keep route files under an agreed size threshold. Once a route owns meaningful UI or helper logic, extract a feature screen.
- Add a release validation script for remote app config.
- Add one E2E smoke path per critical workflow after the unit/store layer is solid.
- Keep docs close to code and review them when paths move. Architecture docs drift quickly.

## Architecture Review Questions

Use these questions during reviews:

- Is this route file mostly composition?
- Does this feature own its API, keys, queries, types, and tests?
- Are query keys created through a feature key factory?
- Is server state in Query and client/realtime state in a store?
- Does this workflow fail closed where required?
- Is navigation using route builders instead of scattered strings?
- Are return paths sanitized before storage or navigation?
- Does logout/user switch clear all sensitive or cross-user state?
- Are notification taps routed from payload data?
- Are realtime events idempotent and scoped to the active session?
- Does the test layer cover the risky behavior, not just render snapshots?
- Would a second app team understand this pattern without product context?

## Final Standard

A strong Expo architecture for future projects should feel like this:

- Startup is predictable.
- Runtime config is explicit.
- Routes are guarded declaratively.
- Features own their data and UI.
- Shared components are actually shared.
- High-risk flows are centralized and tested.
- Realtime is scoped and idempotent.
- Notifications are payload-driven.
- Session reset is complete.
- Release gates exist before they are urgently needed.
