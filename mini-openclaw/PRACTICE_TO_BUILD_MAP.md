# Practice To Build Map

This file maps the existing `openclaw-practice` study track to the new Mini OpenClaw implementation plan.

## Core mapping

- `01-context-window-management.md`
  - new project target: context budgeting and prompt guards
  - implementation phase: Phase 4 and Phase 8

- `02-conversation-history-truncation.md`
  - new project target: transcript trimming and compaction triggers
  - implementation phase: Phase 4 and Phase 8

- `03-rag-hybrid-search.md`
  - new project target: hybrid memory retrieval
  - implementation phase: Phase 8

- `04-tool-function-calling.md`
  - new project target: tool registry and tool-call loop
  - implementation phase: Phase 4 and Phase 6

- `05-agent-routing-session-design.md`
  - new project target: binding rules, route resolution, session key strategy
  - implementation phase: Phase 2

- `06-auth-failover-multi-provider.md`
  - new project target: provider adapter plus fallback and cooldown policy
  - implementation phase: Phase 5

- `07-conversation-compaction.md`
  - new project target: summary compaction and context rollover
  - implementation phase: Phase 8

- `08-prompt-caching.md`
  - new project target: provider-aware prompt caching hooks
  - implementation phase: after Phase 5, optional optimization

- `09-multi-agent-orchestration.md`
  - new project target: cross-session handoff, spawned runs, delegated tools
  - implementation phase: after the single-agent core is stable

- `10-plugin-skill-architecture.md`
  - new project target: plugin manifests, runtime registration, skill injection
  - implementation phase: Phase 9

## Recommendation

Build in this order:

1. session routing
2. gateway protocol
3. agent turn loop
4. tools
5. provider fallback
6. memory and compaction
7. multi-agent and plugins

That order matches both the upstream architecture and the strongest interview narrative.
