import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { MiniGatewayRuntime } from "./runtime.js";
import { ToolRegistry } from "../tools/registry.js";

class EchoThenFinishProvider implements ProviderAdapter {
  id = "fake-provider";
  private turns = 0;

  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    if (this.turns === 0) {
      this.turns += 1;
      return {
        kind: "tool_call",
        toolCall: {
          name: "echo",
          input: { text: input.message },
        },
      };
    }
    return {
      kind: "message",
      text: "final answer",
    };
  }
}

describe("MiniGatewayRuntime", () => {
  it("handles agent.run and emits started/delta/finished events", async () => {
    const tools = new ToolRegistry();
    tools.register({
      name: "echo",
      description: "Echoes input",
      async execute(input) {
        return input;
      },
    });

    const runtime = new MiniGatewayRuntime({
      provider: new EchoThenFinishProvider(),
      tools,
      createRunId: () => "run-1",
      now: () => 42,
    });

    const events: string[] = [];
    runtime.onEvent((event) => {
      events.push(event.event);
    });

    const before = await runtime.handleRequest({
      type: "req",
      id: "1",
      method: "sessions.get",
      params: { sessionKey: "agent:main:main" },
    });
    expect(before.ok).toBe(true);
    if (before.ok) {
      expect(before.payload.found).toBe(false);
    }

    const run = await runtime.handleRequest({
      type: "req",
      id: "2",
      method: "agent.run",
      params: {
        sessionKey: "agent:main:main",
        message: "hello",
      },
    });
    expect(run.ok).toBe(true);
    if (run.ok) {
      expect(run.payload.runId).toBe("run-1");
      expect(run.payload.accepted).toBe(true);
    }

    const after = await runtime.handleRequest({
      type: "req",
      id: "3",
      method: "sessions.get",
      params: { sessionKey: "agent:main:main" },
    });
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.payload.found).toBe(true);
      expect(after.payload.sessionId).toMatch(/^sess_[a-f0-9]{16}$/);
    }

    expect(events).toEqual(["agent.started", "agent.delta", "agent.finished"]);
  });
});
