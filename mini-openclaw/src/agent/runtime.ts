import type { SessionRecord } from "../core/types.js";

export type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

export type ToolResult = {
  name: string;
  ok: boolean;
  output: unknown;
};

export type AgentTurnInput = {
  agentId: string;
  session: SessionRecord;
  message: string;
  systemPrompt: string;
  availableTools: string[];
};

export type ProviderResponse =
  | { kind: "message"; text: string }
  | { kind: "tool_call"; toolCall: ToolCall };

export type ProviderAdapter = {
  id: string;
  runTurn(input: AgentTurnInput): Promise<ProviderResponse>;
};

export type ToolExecutor = {
  execute(call: ToolCall): Promise<ToolResult>;
};

export type MessageHistoryLoader = {
  load(sessionKey: string): Promise<string[]>;
};

export type TranscriptWriter = {
  append(entry: {
    sessionKey: string;
    role: "user" | "assistant" | "tool";
    content: string;
    timestamp: number;
  }): Promise<void>;
};

export type PromptBuilder = {
  build(input: AgentTurnInput, history: string[]): string;
};

export type UsageReport = {
  providerId: string;
  rounds: number;
  toolCalls: number;
  durationMs: number;
};

export type AgentTurnResult = {
  finalText: string;
  toolResults: ToolResult[];
  usage: UsageReport;
};

/**
 * 执行一次 Agent 回合循环。
 * @param params.provider 模型提供方适配器，负责根据输入生成消息或工具调用。
 * @param params.tools 工具执行器，负责执行模型请求的工具。
 * @param params.input 本轮输入上下文（agentId、会话、用户消息、系统提示词、可用工具）。
 * @param params.maxToolRounds 最多工具调用轮数，未提供时默认 4。
 * @returns 返回最终文本与本轮累计工具执行结果。
 */
export async function runAgentTurn(params: {
  provider: ProviderAdapter;
  tools: ToolExecutor;
  input: AgentTurnInput;
  maxToolRounds?: number;
  historyLoader?: MessageHistoryLoader;
  transcriptWriter?: TranscriptWriter;
  promptBuilder?: PromptBuilder;
  now?: () => number;
}): Promise<AgentTurnResult> {
  const maxToolRounds = params.maxToolRounds ?? 4;
  const now = params.now ?? (() => Date.now());
  const startedAt = now();
  const toolResults: ToolResult[] = [];
  const history = params.historyLoader
    ? await params.historyLoader.load(params.input.session.sessionKey)
    : [];
  const builtPrompt = params.promptBuilder?.build(params.input, history) ?? params.input.systemPrompt;
  let loopInput: AgentTurnInput = {
    ...params.input,
    systemPrompt: builtPrompt,
    message: history.length > 0 ? `${history.join("\n")}\n${params.input.message}` : params.input.message,
  };

  await params.transcriptWriter?.append({
    sessionKey: params.input.session.sessionKey,
    role: "user",
    content: params.input.message,
    timestamp: now(),
  });

  for (let round = 0; round < maxToolRounds; round += 1) {
    const response = await params.provider.runTurn(loopInput);
    if (response.kind === "message") {
      await params.transcriptWriter?.append({
        sessionKey: params.input.session.sessionKey,
        role: "assistant",
        content: response.text,
        timestamp: now(),
      });
      return {
        finalText: response.text,
        toolResults,
        usage: {
          providerId: params.provider.id,
          rounds: round + 1,
          toolCalls: toolResults.length,
          durationMs: now() - startedAt,
        },
      };
    }

    const result = await params.tools.execute(response.toolCall);
    toolResults.push(result);
    await params.transcriptWriter?.append({
      sessionKey: params.input.session.sessionKey,
      role: "tool",
      content: `${result.name}: ${JSON.stringify(result.output)}`,
      timestamp: now(),
    });
    loopInput = {
      ...loopInput,
      message: `${loopInput.message}\n\nTool result from ${result.name}:\n${JSON.stringify(result.output)}`,
    };
  }

  return {
    finalText: "Tool loop limit reached before a final answer.",
    toolResults,
    usage: {
      providerId: params.provider.id,
      rounds: maxToolRounds,
      toolCalls: toolResults.length,
      durationMs: now() - startedAt,
    },
  };
}
