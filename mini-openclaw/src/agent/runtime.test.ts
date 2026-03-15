import { describe, expect, it } from "vitest";
import { runAgentTurn, type AgentTurnInput, type ProviderAdapter, type ProviderResponse } from "./runtime.js";

class CapturingProvider implements ProviderAdapter {
  id = "capture";
  seenInput: AgentTurnInput | null = null;

  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    this.seenInput = input;
    return { kind: "message", text: "ok" };
  }
}

describe("runAgentTurn", () => {
  it("uses history/prompt/transcript hooks and reports usage", async () => {
    const provider = new CapturingProvider();
    const transcript: string[] = [];
    let now = 10;
    const result = await runAgentTurn({
      provider,
      tools: {
        async execute() {
          throw new Error("should not call tool");
        },
      },
      input: {
        agentId: "main",
        session: { sessionKey: "agent:main:main", sessionId: "s1", updatedAt: 0 },
        message: "user message",
        systemPrompt: "base",
        availableTools: ["x"],
      },
      historyLoader: {
        async load() {
          return ["user: old"];
        },
      },
      promptBuilder: {
        build(input, history) {
          return `${input.systemPrompt}|history:${history.length}`;
        },
      },
      transcriptWriter: {
        async append(entry) {
          transcript.push(`${entry.role}:${entry.content}`);
        },
      },
      now: () => {
        now += 5;
        return now;
      },
    });

    expect(provider.seenInput?.systemPrompt).toBe("base|history:1");
    expect(provider.seenInput?.message).toContain("user: old");
    expect(result.finalText).toBe("ok");
    expect(result.usage.providerId).toBe("capture");
    expect(result.usage.rounds).toBe(1);
    expect(transcript).toEqual(["user:user message", "assistant:ok"]);
  });
});
