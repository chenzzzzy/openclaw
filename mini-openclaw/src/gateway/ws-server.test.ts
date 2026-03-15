import WebSocket from "ws";
import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { ToolRegistry } from "../tools/registry.js";
import { MiniGatewayRuntime } from "./runtime.js";
import { GatewayWsServer } from "./ws-server.js";

class StaticProvider implements ProviderAdapter {
  id = "static";
  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    return { kind: "message", text: `done:${input.message}` };
  }
}

describe("GatewayWsServer", () => {
  it("accepts requests and broadcasts events", async () => {
    const runtime = new MiniGatewayRuntime({
      provider: new StaticProvider(),
      tools: new ToolRegistry(),
      createRunId: () => "run-ws",
      now: () => 1,
    });
    const wsServer = new GatewayWsServer(runtime, { host: "127.0.0.1", port: 0 });
    const address = await wsServer.start();

    try {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
      const seen: Array<{ type: string; event?: string; id?: string; ok?: boolean }> = [];

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("timeout"));
        }, 5_000);

        socket.on("open", () => {
          socket.send(
            JSON.stringify({
              type: "req",
              id: "r1",
              method: "health.check",
              params: {},
            }),
          );
          socket.send(
            JSON.stringify({
              type: "req",
              id: "r2",
              method: "agent.run",
              params: { sessionKey: "agent:main:main", message: "hi" },
            }),
          );
        });

        socket.on("message", (raw) => {
          const parsed = JSON.parse(raw.toString()) as {
            type: string;
            event?: string;
            id?: string;
            ok?: boolean;
          };
          seen.push(parsed);
          const hasHealth = seen.some((item) => item.type === "res" && item.id === "r1" && item.ok === true);
          const hasRun = seen.some((item) => item.type === "res" && item.id === "r2" && item.ok === true);
          const hasFinished = seen.some((item) => item.type === "event" && item.event === "agent.finished");
          if (hasHealth && hasRun && hasFinished) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      socket.close();
      expect(seen.some((item) => item.type === "event" && item.event === "agent.started")).toBe(true);
    } finally {
      await wsServer.stop();
    }
  });
});
