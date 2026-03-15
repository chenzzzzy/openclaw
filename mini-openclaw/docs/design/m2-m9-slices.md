# M2-M9 Design Note: Minimal Vertical Slices

## Milestone

Finish roadmap phases with the smallest runnable architecture.

## Implemented slices

- M2/M3 gateway control plane:
  - `GatewayWsServer` for request/response and event streaming
  - CLI `agent.run` client (`src/cli/agent-run.ts`)
- M4 agent turn engine:
  - history loader, prompt builder, transcript writer, usage report
- M5 provider fallback:
  - fallback chain with retryability and cooldown
  - profile store for ordered provider selection
- M6 tools:
  - schemas + runtime + audit log
  - built-ins: `read_file`, `write_file`, `shell`, `web_search`, `memory_search`, `sessions_list`, `sessions_send`
- M7 channel:
  - `WebChatAdapter` end-to-end flow
- M8 memory:
  - hybrid-style retrieval (keyword + recency)
  - transcript compaction utility
- M9 plugins/skills:
  - plugin loader with manifest and activation
  - markdown skill loader and prompt assembly

## Tradeoffs

- Durable session store is JSON-file based for clarity, not high-concurrency safe.
- Web search tool is intentionally stubbed in local-first core.
- Plugin loader trusts local plugin code (no sandboxing in this phase).
- Channel layer currently ships one adapter only.
