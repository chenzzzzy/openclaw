import { randomUUID } from "node:crypto";
import { DefaultPromptBuilder } from "../agent/prompt.js";
import {
  runAgentTurn,
  type MessageHistoryLoader,
  type PromptBuilder,
  type ProviderAdapter,
  type ToolExecutor,
  type TranscriptWriter,
} from "../agent/runtime.js";
import { resolveRoute, type RouterOptions } from "../core/router.js";
import { parseSessionKey } from "../core/session-key.js";
import type { BindingRule, InboundMessage, ResolvedRoute, SessionRecord } from "../core/types.js";
import type {
  GatewayEvent,
  GatewayFailure,
  GatewayRequestName,
  GatewayRequest,
  GatewayRequestUnion,
  GatewaySuccess,
  GatewaySuccessUnion,
} from "./protocol.js";
import { InMemorySessionStore, type SessionStore } from "../store/session-store.js";

type EventHandler = (event: GatewayEvent) => void;

type GatewayRuntimeOptions = {
  provider: ProviderAdapter;
  tools: ToolExecutor;
  sessions?: SessionStore;
  historyLoader?: MessageHistoryLoader;
  transcriptWriter?: TranscriptWriter;
  promptBuilder?: PromptBuilder;
  streaming?: {
    enableDeltaStream?: boolean;
    deltaChunkSize?: number;
    deltaChunkDelayMs?: number;
  };
  now?: () => number;
  createRunId?: () => string;
};

export type ResolvedInbound = ResolvedRoute & {
  session: SessionRecord;
};

export class MiniGatewayRuntime {
  private readonly provider: ProviderAdapter;
  private readonly tools: ToolExecutor;
  private readonly sessions: SessionStore;
  private readonly historyLoader?: MessageHistoryLoader;
  private readonly transcriptWriter?: TranscriptWriter;
  private readonly promptBuilder: PromptBuilder;
  private readonly streaming: {
    enableDeltaStream: boolean;
    deltaChunkSize: number;
    deltaChunkDelayMs: number;
  };
  private readonly now: () => number;
  private readonly createRunId: () => string;
  private readonly handlers = new Set<EventHandler>();

  constructor(options: GatewayRuntimeOptions) {
    this.provider = options.provider;
    this.tools = options.tools;
    this.sessions = options.sessions ?? new InMemorySessionStore();
    this.historyLoader = options.historyLoader;
    this.transcriptWriter = options.transcriptWriter;
    this.promptBuilder = options.promptBuilder ?? new DefaultPromptBuilder();
    this.streaming = {
      enableDeltaStream: options.streaming?.enableDeltaStream ?? false,
      deltaChunkSize: options.streaming?.deltaChunkSize ?? 12,
      deltaChunkDelayMs: options.streaming?.deltaChunkDelayMs ?? 0,
    };
    this.now = options.now ?? (() => Date.now());
    this.createRunId = options.createRunId ?? (() => randomUUID());
  }

  /**
   * 注册网关事件处理器。
   * @param handler 事件回调函数。
   * @returns 返回取消订阅函数，调用后移除此 handler。
   */
  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * 将入站消息解析为路由于会话信息。
   * @param message 入站消息。
   * @param bindings 绑定规则列表。
   * @param options 路由选项。
   * @returns 返回路由结果并附加已获取/创建的会话记录。
   */
  resolveInbound(
    message: InboundMessage,
    bindings: BindingRule[],
    options: RouterOptions = {},
  ): ResolvedInbound {
    const route = resolveRoute(message, bindings, options);
    const session = this.sessions.getOrCreate(route.sessionKey);
    return {
      ...route,
      session,
    };
  }

  /**
   * 处理网关请求（重载签名：支持具体 method 与联合类型）。
   * @param request 网关请求对象。
   * @returns 返回成功响应或失败响应。
   */
  async handleRequest<K extends GatewayRequestName>(
    request: GatewayRequest<K>,
  ): Promise<GatewaySuccess<K> | GatewayFailure>;
  async handleRequest(request: GatewayRequestUnion): Promise<GatewaySuccessUnion | GatewayFailure> {
    switch (request.method) {
      case "health.check":
        return {
          type: "res",
          id: request.id,
          ok: true,
          payload: { ok: true },
        };

      case "sessions.get": {
        const { sessionKey } = request.params;
        const found = this.sessions.get(sessionKey);
        return {
          type: "res",
          id: request.id,
          ok: true,
          payload: {
            sessionKey,
            found: Boolean(found),
            sessionId: found?.sessionId,
            updatedAt: found?.updatedAt,
          },
        };
      }

      case "agent.run":
        return this.runAgent(
          request.id,
          request.params.sessionKey,
          request.params.message,
          request.params.agentId,
        );
    }

    return this.unreachableRequest(request);
  }

  /**
   * 运行一次 Agent 请求并发出生命周期事件。
   * @param requestId 请求 ID，用于响应关联。
   * @param sessionKey 会话 key，用于获取/更新会话。
   * @param message 用户输入消息。
   * @param requestedAgentId 可选指定 agentId；为空时从 sessionKey 推断。
   * @returns 返回 agent.run 成功响应（含 runId）。
   */
  private async runAgent(
    requestId: string,
    sessionKey: string,
    message: string,
    requestedAgentId?: string,
  ): Promise<GatewaySuccess<"agent.run">> {
    const runId = this.createRunId();
    const session = this.sessions.getOrCreate(sessionKey);
    const agentId = requestedAgentId ?? parseSessionKey(sessionKey).agentId;
    const availableTools = this.listTools();

    this.emit({
      type: "event",
      event: "agent.started",
      payload: {
        runId,
        sessionKey,
      },
    });

    const turn = await runAgentTurn({
      provider: this.provider,
      tools: this.tools,
      input: {
        agentId,
        session,
        message,
        systemPrompt: "You are Mini OpenClaw.",
        availableTools,
      },
      historyLoader: this.historyLoader,
      transcriptWriter: this.transcriptWriter,
      promptBuilder: this.promptBuilder,
      now: this.now,
    });

    for (const toolResult of turn.toolResults) {
      this.emit({
        type: "event",
        event: "agent.delta",
        payload: {
          runId,
          text: `tool:${toolResult.name} ok=${String(toolResult.ok)}`,
        },
      });
    }

    if (this.streaming.enableDeltaStream) {
      for (const chunk of splitChunks(turn.finalText, this.streaming.deltaChunkSize)) {
        this.emit({
          type: "event",
          event: "agent.delta",
          payload: {
            runId,
            text: chunk,
          },
        });
        if (this.streaming.deltaChunkDelayMs > 0) {
          await sleep(this.streaming.deltaChunkDelayMs);
        }
      }
    }

    this.emit({
      type: "event",
      event: "agent.finished",
      payload: {
        runId,
        text: turn.finalText,
      },
    });

    this.sessions.upsert(sessionKey, {
      updatedAt: this.now(),
      summary: turn.finalText,
      provider: this.provider.id,
    });

    return {
      type: "res",
      id: requestId,
      ok: true,
      payload: {
        runId,
        accepted: true,
      },
    };
  }

  /**
   * 查询工具执行器可用工具名列表。
   * @returns 返回工具名数组；不支持 list 时返回空数组。
   */
  private listTools(): string[] {
    const listFn = (this.tools as { list?: () => unknown }).list;
    if (typeof listFn === "function") {
      const names = listFn.call(this.tools);
      if (Array.isArray(names)) {
        return names;
      }
    }
    return [];
  }

  /**
   * 向所有已注册处理器广播事件。
   * @param event 网关事件对象。
   * @returns 无返回值。
   */
  private emit(event: GatewayEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /**
   * 处理理论不可达的请求分支。
   * @param _request never 类型占位参数，用于编译期穷尽检查。
   * @returns 返回 METHOD_NOT_SUPPORTED 失败响应。
   */
  private unreachableRequest(_request: never): GatewayFailure {
    return {
      type: "res",
      id: "unknown",
      ok: false,
      error: {
        code: "METHOD_NOT_SUPPORTED",
        message: "Unsupported method",
      },
    };
  }
}

function splitChunks(text: string, size: number): string[] {
  if (!text) {
    return [];
  }
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
