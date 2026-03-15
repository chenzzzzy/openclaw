# Mini OpenClaw Roadmap

## Phase 0 - Architecture lock

Goal:

- freeze the reduced-scope architecture before coding a large amount of surface area

Deliverables:

- domain glossary
- module boundaries
- event and request types
- session key rules

## Phase 1 - Repo bootstrap

Goal:

- create a clean standalone project skeleton

Deliverables:

- package manager choice
- lint/test/typecheck
- `src/` layout
- configuration loader

Suggested layout:

- `src/core`
- `src/gateway`
- `src/agent`
- `src/providers`
- `src/tools`
- `src/channels`
- `src/plugins`
- `src/memory`
- `src/store`

## Phase 2 - Session and routing core

Goal:

- make every inbound event deterministically resolve to one agent and one session

Deliverables:

- session key builder/parser
- route matcher
- binding config
- session metadata store

Acceptance:

- DM, group, and thread paths produce stable session keys
- route precedence is unit tested

## Phase 3 - Gateway control plane

Goal:

- create the central runtime boundary that every surface talks to

Deliverables:

- WebSocket server
- typed request/response protocol
- event broadcaster
- client registry

Acceptance:

- a local CLI client can connect, send an `agent.run` request, and receive streamed events

## Phase 4 - Agent turn engine

Goal:

- implement one high-quality turn loop

Deliverables:

- prompt builder
- message history loader
- tool call loop
- usage reporting
- transcript writer

Acceptance:

- one turn can perform at least one tool call and produce a final response

## Phase 5 - Provider abstraction and fallback

Goal:

- separate model calling from agent orchestration

Deliverables:

- provider adapter interface
- auth/profile store
- fallback chain
- retry and cooldown state

Acceptance:

- provider A failure can fall back to provider B or model B with a structured reason

## Phase 6 - Tool runtime

Goal:

- support real actions with clear policy boundaries

Initial tool set:

- `read_file`
- `write_file`
- `shell`
- `web_search`
- `memory_search`
- `sessions_list`
- `sessions_send`

Acceptance:

- each tool has schema, runtime, result type, and audit logging

## Phase 7 - Channel adapter

Goal:

- prove the architecture works outside the CLI

Recommended first adapter:

- Telegram or WebChat

Acceptance:

- inbound message -> route -> agent -> outbound reply works end to end

## Phase 8 - Memory and compaction

Goal:

- keep long-running conversations useful

Deliverables:

- simple retrieval interface
- transcript chunking
- summary compaction
- optional hybrid ranking with vector plus keyword scoring

Acceptance:

- long sessions stay within context limits without losing critical state

## Phase 9 - Plugins and skills

Goal:

- show extensibility without building a huge monolith

Deliverables:

- plugin manifest
- runtime registration for tools or channels
- skill directory loader
- skill prompt injection

Acceptance:

- a plugin can register one new tool or channel without editing core files

## What not to build early

Do not start with:

- 10+ channels
- desktop/mobile nodes
- visual canvas
- remote deployment
- complex operator UI
- release automation

Those are scale features, not proof-of-understanding features.

## Resume framing

The portfolio-friendly framing is:

- built a local-first multi-agent gateway
- designed deterministic session routing across channels
- implemented tool-driven LLM runtime with model fallback
- added pluggable channels, tools, and skills
- shipped memory retrieval and transcript compaction for long-lived conversations
