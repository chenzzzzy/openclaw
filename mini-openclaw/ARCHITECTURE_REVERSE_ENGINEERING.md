# OpenClaw Architecture Reverse Engineering

This analysis is based on reading the current repository code and docs, not guesswork.

## 1. The real architecture in one sentence

OpenClaw is not "a chatbot."

It is a local-first gateway that owns channel connections, session identity, tool execution, and agent runtime orchestration, while exposing a typed control plane to CLI, apps, web surfaces, and device nodes.

## 2. Core layers and why they matter

### A. Bootstrap and CLI surface

Key files:

- `openclaw.mjs`
- `src/entry.ts`
- `src/cli/run-main.ts`
- `src/cli/program.ts`
- `src/commands/agent.ts`
- `src/commands/agent-via-gateway.ts`

What this layer does:

- validates runtime and startup environment
- normalizes argv and profile selection
- routes commands either to the gateway or a local embedded path
- keeps the CLI as the main operator UX

Architectural insight:

OpenClaw treats CLI as a first-class control surface, not a debug afterthought.

### B. Gateway control plane

Key files:

- `docs/concepts/architecture.md`
- `src/gateway/server.impl.ts`
- `src/gateway/server-http.ts`
- `src/gateway/server-ws-runtime.ts`
- `src/gateway/server-methods.ts`
- `src/gateway/server-channels.ts`
- `src/gateway/server-chat.ts`

What this layer does:

- hosts WebSocket and HTTP endpoints
- manages authenticated clients and nodes
- owns runtime state, channel lifecycles, events, and subscriptions
- exposes one shared control plane to every operator surface

Architectural insight:

The gateway is the real product core. Channels, apps, and tools are all docked into it.

### C. Agent runtime

Key files:

- `src/agents/pi-embedded-runner/run.ts`
- `src/agents/pi-embedded-runner/model.ts`
- `src/agents/pi-embedded-runner/system-prompt.ts`
- `src/agents/context-window-guard.ts`
- `src/agents/compaction.ts`
- `src/agents/model-fallback.ts`

What this layer does:

- resolves provider/model/auth profile
- builds system prompt, skills prompt, and tool set
- runs the core think -> tool -> retry/fallback -> finalize loop
- guards context window and handles compaction
- records usage and failure state

Architectural insight:

This is where OpenClaw stops being an integration project and becomes an agent runtime.

### D. Session identity and routing

Key files:

- `src/routing/session-key.ts`
- `src/routing/resolve-route.ts`
- `docs/concepts/session.md`
- `src/sessions/transcript-events.ts`

What this layer does:

- defines how an inbound message maps to a stable session key
- isolates DM, group, thread, agent, and account scopes
- decides which agent handles which channel/account/peer
- gives persistence, concurrency, and replay a stable backbone

Architectural insight:

If you rebuild only one thing deeply, rebuild session keying and routing correctly. This is the spine of the whole system.

### E. Channel abstraction

Key files:

- `src/channels/plugins/index.ts`
- `src/channels/plugins/types.ts`
- `src/gateway/server-channels.ts`
- `extensions/*`

What this layer does:

- treats channels as plugins with standardized lifecycle and config contracts
- isolates provider-specific login, outbound, grouping, and security behavior
- lets the gateway manage channels uniformly

Architectural insight:

OpenClaw is multi-channel because it made channels a dockable runtime unit, not because it copy-pasted integrations.

### F. Tool runtime

Key files:

- `src/agents/tools/*.ts`
- `src/agents/bash-tools.ts`
- `src/agents/tools/web-search.ts`
- `src/agents/tools/sessions-send-tool.ts`
- `docs/tools/multi-agent-sandbox-tools.md`

What this layer does:

- registers tool definitions
- applies tool policy and sandbox/elevated rules
- executes high-value actions like exec, browser, node, memory, web, gateway, and session tools

Architectural insight:

The tool layer is policy-driven and channel-aware. It is not just function calling.

### G. Plugins and skills

Key files:

- `src/plugins/loader.ts`
- `src/plugins/runtime/index.ts`
- `docs/tools/plugin.md`
- `src/agents/skills/*`
- `docs/tools/skills.md`

What this layer does:

- loads runtime extensions
- exposes controlled runtime helpers
- lets plugins add channels, tools, hooks, HTTP routes, and services
- teaches the model behavior through skill folders and load-time gating

Architectural insight:

OpenClaw separates capability code from agent teaching. Plugins add power; skills add judgment and usage guidance.

### H. Memory and retrieval

Key files:

- `src/memory/hybrid.ts`
- `src/memory/mmr.ts`
- `src/memory/temporal-decay.ts`
- `src/memory/manager.ts`

What this layer does:

- supports vector plus keyword search
- merges results with weighted scoring
- improves retrieval diversity with MMR
- biases recency with temporal decay

Architectural insight:

Memory is not just a vector DB call. It is a retrieval ranking pipeline.

## 3. The shortest accurate runtime flow

1. CLI, WebChat, or a channel adapter sends a request into the gateway.
2. The gateway resolves the target agent and session key.
3. Session state and transcript context are loaded.
4. Skills, tools, model config, auth profiles, and policy are resolved.
5. The embedded agent runtime executes one turn.
6. Tool calls stream through the gateway event system.
7. Failures can rotate auth profiles or fall back to another model.
8. The final response is persisted and optionally delivered back to the originating channel.

## 4. Which parts are essential for your own rebuild

### Must rebuild yourself

- session-key strategy
- route resolution
- agent turn orchestration
- provider abstraction
- tool registry and execution contract
- transcript/session persistence
- model fallback logic

These are the parts interviewers care about because they show systems thinking.

### Can simplify heavily

- number of channels
- control UI
- onboarding wizard
- auth UX
- packaging
- mobile/mac nodes
- full plugin marketplace behavior

### Can reuse ideas or even code selectively

- session key format ideas from `src/routing/session-key.ts`
- route precedence ideas from `src/routing/resolve-route.ts`
- hybrid retrieval scoring from `src/memory/hybrid.ts`
- plugin manifest and loader ideas from `src/plugins/loader.ts`
- fallback semantics from `src/agents/model-fallback.ts`

## 5. Recommended portfolio cut

If you want the best signal-to-effort ratio, your personal rebuild should ship these milestones:

1. gateway plus CLI
2. session keys plus routing
3. embedded agent loop
4. tool execution
5. model fallback
6. one chat channel adapter
7. lightweight plugin/skill system
8. optional memory retrieval

That is enough to say:

"I rebuilt the core control plane, session architecture, and tool-driven multi-agent runtime of an OpenClaw-like system from scratch."

That is a very strong interview story.
