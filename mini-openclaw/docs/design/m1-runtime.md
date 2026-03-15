# M1 Design Note: Deterministic Core Runtime

## Milestone

Deterministic session identity and a minimal local gateway runtime.

## Why this design

The first vertical slice needs two properties:

1. every request maps to stable session identity
2. the gateway can execute a real agent turn and emit observable events

To keep the core small and testable, this milestone uses:

- `InMemorySessionStore` keyed by `sessionKey`
- deterministic `sessionId = hash(sessionKey)` for replay-safe identity
- `MiniGatewayRuntime` that handles only `health.check`, `sessions.get`, `agent.run`

## Tradeoffs

- We intentionally skip websocket transport in this slice.
- We intentionally skip persistent storage in this slice.
- We intentionally keep one provider adapter contract and one runtime loop path.

These choices keep the boundary small while preserving a direct migration path:

- add transport around `MiniGatewayRuntime` methods
- swap `SessionStore` implementation without changing runtime orchestration
- add provider fallback as a wrapper around `ProviderAdapter`
