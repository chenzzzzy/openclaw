import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { ToolRegistry } from "../tools/registry.js";
import { MiniGatewayRuntime } from "../gateway/runtime.js";
import { WebChatAdapter } from "./webchat.js";

class WebProvider implements ProviderAdapter {
  id = "web-provider";

  async runTurn(_input: AgentTurnInput): Promise<ProviderResponse> {
    return { kind: "message", text: "reply" };
  }
}

describe("WebChatAdapter", () => {
  it("routes inbound message and returns outbound reply", async () => {
    const runtime = new MiniGatewayRuntime({
      provider: new WebProvider(),
      tools: new ToolRegistry(),
      createRunId: () => "run-web",
      now: () => 1,
    });

    const adapter = new WebChatAdapter(runtime, []);
    const outbound = await adapter.handleInbound({
      peerId: "u1",
      text: "hello",
      kind: "direct",
    });
    expect(outbound.agentId).toBe("main");
    expect(outbound.sessionKey).toBe("agent:main:main");
    expect(outbound.text).toContain("reply");
  });
});
