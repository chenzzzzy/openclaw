# Mini OpenClaw Worklog

Branch:

- `codex/openclaw-rebuild-blueprint`

## Completed

- analyzed the current OpenClaw architecture from source and docs
- identified the true core subsystems worth rebuilding
- separated must-rebuild modules from optional product surface
- created a portfolio-oriented roadmap for a smaller personal implementation
- wrote a Codex prompt playbook for staged VibeCoding development
- created an initial code skeleton for the new implementation
- added standalone package scripts for build and test
- implemented deterministic in-memory session store
- implemented minimal gateway runtime (`health.check`, `sessions.get`, `agent.run`)
- added acceptance tests for session keys, routing precedence, and runtime events
- documented M1 tradeoffs in `docs/design/m1-runtime.md`
- added websocket control plane with request handling and event broadcasting
- added CLI `agent.run` websocket client path
- extended agent turn engine with prompt/history/transcript/usage hooks
- added provider fallback chain with retryability and cooldown semantics
- added durable file-backed session store implementation
- added built-in tools and tool audit log
- added webchat channel adapter end-to-end path
- added memory retrieval and transcript compaction modules
- added plugin loader and skill loader modules
- added full acceptance tests for phases M2-M9
- documented M2-M9 tradeoffs in `docs/design/m2-m9-slices.md`
- added minimal web chat page with websocket streaming rendering (`web/chat.html`)
- added local static web UI server command (`pnpm ui:web`)
- added OpenAI-compatible LLM provider integration with config loader
- added `config/llm.json` + `config/llm.example.json` for url/apiKey/model settings

## Today summary (2026-03-15)

Milestone:

- M9 (minimal vertical slices): keep repo runnable/testable while finishing roadmap phases.

Implemented requirements (grouped):

- gateway and protocol:
  - websocket control plane for typed request/response and runtime event broadcast
  - runtime streaming mode via `agent.delta` chunking
- runtime and orchestration:
  - agent loop hooks for history loading, prompt building, transcript writing, usage reporting
  - provider fallback wrapper with retryability and cooldown behavior
  - provider profile store for ordered provider selection
- tools and memory:
  - built-in tools (`read_file`, `write_file`, `shell`, `web_search`, `memory_search`, `sessions_list`, `sessions_send`)
  - tool audit log and result recording
  - memory retrieval (keyword + recency) and transcript compaction
- channels, plugins, skills:
  - webchat adapter end-to-end flow (inbound -> route -> run -> outbound)
  - plugin manifest loader and runtime registration
  - markdown skill loader and skill prompt assembly
- web experience:
  - minimal chat page `web/chat.html` with incremental rendering from `agent.delta`
  - local static UI server command `pnpm ui:web` for browser validation (avoids CSP issues from `chrome://` pages)
- LLM provider integration:
  - OpenAI-compatible provider implementation for third-party API vendors
  - config loader with `config/llm.json` and optional git-ignored `config/llm.local.json`
  - gateway boot path now auto-selects real LLM provider when config is valid, else falls back to `EchoProvider`

Issues encountered and fixes:

- fixed TypeScript method-response narrowing for `handleRequest` to remove `TS2339` in tests
- fixed event ordering race in webchat/cli paths (`agent.finished` arriving before `agent.run` response)
- fixed compile-time enum narrowing in binding config parser (`ChannelId` and `ChatKind`)
- fixed local command noise by using non-login shell for stable execution

Validation log:

- build:
  - `pnpm build` passed
- tests:
  - `pnpm test` passed with `21` test files and `31` tests
- browser validation flow:
  - start gateway: `pnpm gateway:ws`
  - start web page server: `pnpm ui:web`
  - open: `http://127.0.0.1:4173/chat.html`
  - verify request/streaming/final event loop in UI

## Current deliverables on this branch

- `mini-openclaw/README.md`
- `mini-openclaw/ARCHITECTURE_REVERSE_ENGINEERING.md`
- `mini-openclaw/ROADMAP.md`
- `mini-openclaw/CODEX_PROMPTS.md`
- `mini-openclaw/PRACTICE_TO_BUILD_MAP.md`
- `mini-openclaw/src/`

## Next tasks

1. add transport/auth hardening around websocket server
2. replace JSON file persistence with durable database-backed store
3. add policy layer for plugin/tool sandbox constraints
4. add one real external channel adapter (Telegram or similar)

## Reuse strategy

Rebuild from scratch:

- routing
- session keying
- gateway protocol
- agent runtime
- tool registry
- provider fallback

Reuse or heavily adapt ideas from upstream:

- hybrid retrieval scoring
- plugin manifest shape
- skill loading pattern
- auth profile cooldown semantics

Simplify aggressively:

- number of channels
- remote ops
- UI
- onboarding
- packaging
- node/mobile surfaces
