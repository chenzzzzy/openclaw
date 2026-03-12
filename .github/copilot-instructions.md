# Copilot Instructions for OpenClaw

## Build, lint, and test commands

- Install deps: `pnpm install`
- Build: `pnpm build`
- Full checks (format + types + lint + policy checks): `pnpm check`
- Type-only check: `pnpm tsgo`
- Unit/integration default suite: `pnpm test`
- E2E suite: `pnpm test:e2e`
- Coverage: `pnpm test:coverage`
- Live/provider tests: `pnpm test:live`

Single-test runs:

- Unit/integration file: `pnpm test -- src/path/to/file.test.ts`
- E2E file: `pnpm exec vitest run --config vitest.e2e.config.ts src/path/to/file.e2e.test.ts`
- Live file: `pnpm test:live src/path/to/file.live.test.ts`

## High-level architecture (big picture)

1. CLI bootstrap and routing:
   - `openclaw.mjs` enforces Node 22.12+ and loads built entry (`dist/entry.*`).
   - `src/entry.ts` normalizes env/argv, handles fast `--help`/`--version`, then calls `runCli`.
   - `src/cli/run-main.ts` does route-first execution (`tryRouteCli`) and lazy command registration.
   - Command registration is split between core commands (`src/cli/program/command-registry.ts`) and sub-CLIs (`src/cli/program/register.subclis.ts`), both using lazy dynamic imports.

2. Gateway as control plane:
   - `src/gateway/server.impl.ts` is the composition root for gateway startup.
   - Startup flow includes config migration/validation, secrets runtime activation, plugin loading, channel manager startup, and WS/HTTP surface wiring.
   - WS and RPC methods are defined by `src/gateway/server-methods-list.ts` + handlers and attached via `src/gateway/server-ws-runtime.ts`.
   - HTTP surfaces (`/health`, hooks, OpenAI-compatible endpoints, plugin routes, Control UI) are wired in `src/gateway/server-http.ts`.

3. Channels and plugin system:
   - Global plugin registry state lives in `src/plugins/runtime.ts`.
   - Channel plugins are resolved from the active plugin registry (`src/channels/plugins/index.ts`), then managed by gateway channel lifecycle code (`src/gateway/server-channels.ts`).
   - Shared channel behavior should use lightweight channel metadata/adapters in `src/channels/dock.ts`; avoid importing heavy plugin modules in shared paths.

4. Agent/session routing:
   - Incoming channel/account/peer/team/role context is resolved to `agentId` + `sessionKey` in `src/routing/resolve-route.ts`.
   - Session keys are first-class for persistence and concurrency boundaries across channels.

## Key repository conventions

- Keep code non-redundant: reuse existing helpers; do not add duplicate utility functions or thin re-export wrappers.
- ESM import convention: use `.js` extensions for cross-file imports.
- Lazy-loading pattern is intentional:
  - CLI command registration uses dynamic imports per command path.
  - Channel sender deps use `*.runtime.ts` boundaries in `src/cli/deps.ts`.
- Channel architecture convention:
  - Shared logic imports `src/channels/dock.ts` / `src/channels/registry.ts`.
  - Plugin registry lookups (`src/channels/plugins/*`) are execution-boundary operations, not baseline shared imports.
- Plugin contributions:
  - Runtime plugin deps belong in the extension’s own `package.json` `dependencies`.
  - Do not use `workspace:*` in extension `dependencies`.
- Control UI decorators are legacy-style (`@state() foo = ...`, `@property(...) x = ...`) per `CONTRIBUTING.md` and current tooling.
