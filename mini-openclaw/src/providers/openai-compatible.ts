import type { AgentTurnInput, ProviderAdapter, ProviderResponse } from "../agent/runtime.js";
import type { LlmProviderConfig } from "./config.js";

type FetchLike = typeof fetch;

export class OpenAICompatibleProvider implements ProviderAdapter {
  readonly id: string;
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: LlmProviderConfig,
    options: {
      fetchImpl?: FetchLike;
    } = {},
  ) {
    this.id = `openai-compatible:${config.model}`;
    this.endpoint = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  async runTurn(input: AgentTurnInput): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages: [
            {
              role: "system",
              content: input.systemPrompt,
            },
            {
              role: "user",
              content: input.message,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM_HTTP_${response.status}: ${text}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              function?: {
                name?: string;
                arguments?: string;
              };
            }>;
          };
        }>;
      };
      const message = payload.choices?.[0]?.message;
      if (!message) {
        throw new Error("LLM_BAD_PAYLOAD: missing choices[0].message");
      }

      const toolCall = message.tool_calls?.[0]?.function;
      if (toolCall?.name) {
        let parsedInput: Record<string, unknown> = {};
        if (toolCall.arguments) {
          try {
            parsedInput = JSON.parse(toolCall.arguments) as Record<string, unknown>;
          } catch {
            parsedInput = { raw: toolCall.arguments };
          }
        }
        return {
          kind: "tool_call",
          toolCall: {
            name: toolCall.name,
            input: parsedInput,
          },
        };
      }

      return {
        kind: "message",
        text: message.content ?? "",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
