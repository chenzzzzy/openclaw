# Codex Prompt Playbook For Rebuilding OpenClaw

This file is the prompt system I would use to build a smaller personal OpenClaw with Codex and VibeCoding.

## 1. Master steering prompt

Use this once at project start:

```text
You are my principal engineer and pair programmer.

We are building a new open-source project called Mini OpenClaw, inspired by OpenClaw but rewritten from scratch for learning, interview depth, and portfolio value.

Project goals:
- local-first AI gateway
- multi-agent routing
- deterministic session identity
- tool-driven agent runtime
- pluggable channels and tools
- model/provider fallback
- optional memory retrieval

Constraints:
- prioritize architecture clarity over feature count
- prefer a small, testable core over broad product surface
- build incrementally in vertical slices
- every step must leave the repo runnable or testable
- avoid fake abstractions with no first use
- document tradeoffs in code comments or design notes

Non-goals for early phases:
- mobile apps
- desktop canvas
- dozens of channels
- release automation
- complicated UI

When working:
- always restate the current milestone
- inspect existing code before changing it
- propose the minimum architecture that can support the next two milestones
- implement code, tests, and docs together
- after each change, summarize what is done, what remains, and risks

Output expectations:
- list touched files
- explain why the design is correct
- include acceptance checks
- call out what was simplified compared with production OpenClaw
```

## 2. Milestone prompt template

Use this structure for every major step:

```text
Milestone:
<one sentence goal>

Project context:
We are building Mini OpenClaw, a smaller rewrite of OpenClaw focused on gateway, session, routing, agent runtime, tools, memory, and plugins.

Current constraints:
- keep architecture simple
- do not add product surface unrelated to this milestone
- prefer interfaces and tests over speculative generalization

What to build:
- <deliverable 1>
- <deliverable 2>
- <deliverable 3>

What to avoid:
- <out of scope 1>
- <out of scope 2>

Implementation rules:
- create or update docs for the design
- add unit tests for key logic
- keep filenames and modules aligned with the domain
- prefer explicit types over `any`

Definition of done:
- <behavioral check 1>
- <behavioral check 2>
- <test or manual verification check>

Now inspect the existing repo state and implement this milestone end to end.
```

## 3. Best prompt sequence by phase

### Prompt A - Bootstrap the new repo

```text
Create the initial repository skeleton for Mini OpenClaw.

Need:
- TypeScript project setup
- src layout for core, gateway, agent, tools, providers, channels, plugins, memory, and store
- test and lint scripts
- top-level README with scope and architecture

Do not implement feature details yet.
Only create the clean architectural skeleton and a small number of interfaces that later phases will fill in.
```

### Prompt B - Build session identity and routing first

```text
Implement the session identity and route resolution core.

Need:
- session key parser and builder
- DM/group/thread scope rules
- agent binding matcher
- deterministic route resolution
- unit tests for precedence and normalization

This is one of the highest-value subsystems. Favor correctness and readability over flexibility.
```

### Prompt C - Build the gateway protocol

```text
Implement the first gateway control plane.

Need:
- WebSocket request and event protocol
- client connection registry
- `connect`, `health`, and `agent.run` methods
- event broadcasting for run lifecycle updates

Keep protocol typed and versionable.
Do not build UI yet.
```

### Prompt D - Build the agent turn engine

```text
Implement the first embedded agent runtime.

Need:
- turn input type
- system prompt builder
- transcript loading
- provider call abstraction
- simple tool-call loop
- transcript persistence

Support one complete turn with tool execution and final output.
```

### Prompt E - Add provider fallback

```text
Implement provider and model fallback.

Need:
- provider adapter interface
- auth profile store
- retryable vs non-retryable failure classification
- cooldown tracking
- fallback chain across models/providers

Document the decision model clearly and add tests for failure cases.
```

### Prompt F - Add the tool registry

```text
Implement the tool runtime and registry.

Need:
- tool definition schema
- runtime dispatch
- structured results
- execution audit log
- policies for allow/deny by agent

Start with a very small tool set and make the interfaces solid.
```

### Prompt G - Add one real channel

```text
Implement the first non-CLI channel adapter for Mini OpenClaw.

Recommended channel: Telegram or WebChat.

Need:
- adapter interface
- inbound normalization
- outbound reply path
- route integration with the gateway
- one end-to-end test or harness
```

### Prompt H - Add memory and compaction

```text
Implement memory retrieval and transcript compaction.

Need:
- simple retrieval interface
- transcript chunking
- summary compaction
- optional hybrid ranking with vector plus keyword scoring

Keep it practical. We want a feature that improves long sessions, not a research project.
```

### Prompt I - Add plugins and skills

```text
Implement a minimal plugin and skill system.

Need:
- plugin manifest
- runtime registration for tools or channels
- skill directory loader
- skill prompt injection

Keep the plugin runtime intentionally small and safe.
```

## 4. High-signal review prompts

### Architecture review prompt

```text
Review the current Mini OpenClaw architecture like a staff engineer.

Focus on:
- wrong abstractions
- hidden coupling
- premature generalization
- missing state boundaries
- hard-to-test modules

Do not just praise the code. Identify structural risks and suggest concrete refactors.
```

### Reliability review prompt

```text
Review the current implementation for runtime reliability.

Focus on:
- session corruption risks
- duplicate delivery
- fallback loops
- event ordering
- tool execution failure recovery
- race conditions around streaming and persistence
```

### Interview framing prompt

```text
Based on the current Mini OpenClaw implementation, write:
- a concise architecture summary
- 5 resume bullets
- 10 likely interview questions with strong answers

Use only what the code actually does.
Do not exaggerate.
```

## 5. Prompt anti-patterns to avoid

Bad prompt patterns:

- "Build an openclaw clone"
- "Implement everything"
- "Make it production ready"
- "Add a plugin system" without naming first use cases
- "Refactor for scalability" before a working path exists

Why these fail:

- scope explodes
- abstractions become imaginary
- code quality drops because acceptance criteria are vague

## 6. Golden rule

Every prompt should make Codex answer three questions clearly:

1. What exact subsystem are we building right now?
2. What is explicitly out of scope?
3. How will we know the milestone is done?
