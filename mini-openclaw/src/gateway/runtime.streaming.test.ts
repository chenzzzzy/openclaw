import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { ToolRegistry } from "../tools/registry.js";
import { MiniGatewayRuntime } from "./runtime.js";

class StreamingProvider implements ProviderAdapter {
  id = "streaming-provider";
  async runTurn(_input: AgentTurnInput): Promise<ProviderResponse> {
    return { kind: "message", text: "hello-stream" };
  }
}

describe("MiniGatewayRuntime streaming", () => {
  it("emits delta chunks when stream mode is enabled", async () => {
    const runtime = new MiniGatewayRuntime({
      provider: new StreamingProvider(),
      tools: new ToolRegistry(),
      createRunId: () => "run-stream",
      streaming: {
        enableDeltaStream: true,
        deltaChunkSize: 4,
      },
    });

    const deltas: string[] = [];
    let finalText = "";
    runtime.onEvent((event) => {
      if (event.event === "agent.delta") {
        deltas.push(event.payload.text);
      }
      if (event.event === "agent.finished") {
        finalText = event.payload.text;
      }
    });

    await runtime.handleRequest({
      type: "req",
      id: "r1",
      method: "agent.run",
      params: {
        sessionKey: "agent:main:main",
        message: "x",
      },
    });

    expect(deltas.length).toBeGreaterThan(1);
    expect(deltas.join("")).toBe("hello-stream");
    expect(finalText).toBe("hello-stream");
  });
});
