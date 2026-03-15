import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { ToolRegistry } from "../tools/registry.js";
import { MiniGatewayRuntime } from "../gateway/runtime.js";
import { GatewayWsServer } from "../gateway/ws-server.js";
import { runAgentCli } from "./agent-run.js";

class CliProvider implements ProviderAdapter {
  id = "cli-provider";
  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    return { kind: "message", text: `cli:${input.message}` };
  }
}

describe("runAgentCli", () => {
  it("sends agent.run and returns final text", async () => {
    const runtime = new MiniGatewayRuntime({
      provider: new CliProvider(),
      tools: new ToolRegistry(),
      createRunId: () => "run-cli",
      now: () => 1,
    });
    const server = new GatewayWsServer(runtime, { host: "127.0.0.1", port: 0 });
    const address = await server.start();

    try {
      const text = await runAgentCli({
        url: `ws://127.0.0.1:${address.port}`,
        sessionKey: "agent:main:main",
        message: "hello",
      });
      expect(text).toContain("cli:hello");
    } finally {
      await server.stop();
    }
  });
});
