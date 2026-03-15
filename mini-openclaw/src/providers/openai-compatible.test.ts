import { describe, expect, it } from "vitest";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import type { AgentTurnInput } from "../agent/runtime.js";

const input: AgentTurnInput = {
  agentId: "main",
  session: { sessionKey: "agent:main:main", sessionId: "s1", updatedAt: 0 },
  message: "hello",
  systemPrompt: "sys",
  availableTools: [],
};

describe("OpenAICompatibleProvider", () => {
  it("returns message response", async () => {
    const provider = new OpenAICompatibleProvider(
      {
        baseUrl: "https://example.com/v1",
        apiKey: "k",
        model: "m",
      },
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "hi from llm",
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      },
    );

    const response = await provider.runTurn(input);
    expect(response.kind).toBe("message");
    if (response.kind === "message") {
      expect(response.text).toBe("hi from llm");
    }
  });

  it("returns tool_call when payload contains tool calls", async () => {
    const provider = new OpenAICompatibleProvider(
      {
        baseUrl: "https://example.com/v1",
        apiKey: "k",
        model: "m",
      },
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: "read_file",
                          arguments: "{\"path\":\"README.md\"}",
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      },
    );

    const response = await provider.runTurn(input);
    expect(response.kind).toBe("tool_call");
    if (response.kind === "tool_call") {
      expect(response.toolCall.name).toBe("read_file");
      expect(response.toolCall.input).toEqual({ path: "README.md" });
    }
  });
});
