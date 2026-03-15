import { describe, expect, it } from "vitest";
import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import { FallbackProvider, ProviderFallbackError } from "./fallback.js";

class ThrowingProvider implements ProviderAdapter {
  constructor(
    readonly id: string,
    private readonly message: string,
  ) {}
  async runTurn(_input: AgentTurnInput): Promise<ProviderResponse> {
    throw new Error(this.message);
  }
}

class MessageProvider implements ProviderAdapter {
  constructor(
    readonly id: string,
    private readonly text: string,
  ) {}
  async runTurn(_input: AgentTurnInput): Promise<ProviderResponse> {
    return { kind: "message", text: this.text };
  }
}

const input: AgentTurnInput = {
  agentId: "main",
  session: { sessionKey: "agent:main:main", sessionId: "s1", updatedAt: 0 },
  message: "hi",
  systemPrompt: "s",
  availableTools: [],
};

describe("FallbackProvider", () => {
  it("falls back to next provider on retryable failures", async () => {
    const provider = new FallbackProvider([
      new ThrowingProvider("a", "network timeout"),
      new MessageProvider("b", "ok"),
    ]);
    const response = await provider.runTurn(input);
    expect(response.kind).toBe("message");
    if (response.kind === "message") {
      expect(response.text).toBe("ok");
    }
  });

  it("stops on non-retryable failures", async () => {
    const provider = new FallbackProvider([
      new ThrowingProvider("a", "unauthorized"),
      new MessageProvider("b", "should-not-reach"),
    ]);
    await expect(provider.runTurn(input)).rejects.toBeInstanceOf(ProviderFallbackError);
  });

  it("respects cooldown for failed provider", async () => {
    let now = 100;
    const first = new ThrowingProvider("a", "network");
    const second = new MessageProvider("b", "ok");
    const provider = new FallbackProvider([first, second], {
      cooldownMs: 50,
      now: () => now,
    });

    const r1 = await provider.runTurn(input);
    expect(r1.kind).toBe("message");
    now = 110;
    const r2 = await provider.runTurn(input);
    expect(r2.kind).toBe("message");
  });
});
