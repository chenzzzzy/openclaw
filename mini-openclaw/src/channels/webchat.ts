import { randomUUID } from "node:crypto";
import type { BindingRule, ChatKind, InboundMessage } from "../core/types.js";
import { MiniGatewayRuntime } from "../gateway/runtime.js";
import type { RouterOptions } from "../core/router.js";

export type WebChatInbound = {
  accountId?: string;
  peerId: string;
  kind?: ChatKind;
  threadId?: string;
  text: string;
  timestamp?: number;
};

export type WebChatOutbound = {
  agentId: string;
  sessionKey: string;
  text: string;
};

export class WebChatAdapter {
  constructor(
    private readonly runtime: MiniGatewayRuntime,
    private readonly bindings: BindingRule[],
    private readonly routerOptions: RouterOptions = {},
  ) {}

  async handleInbound(input: WebChatInbound): Promise<WebChatOutbound> {
    const message: InboundMessage = {
      channel: "webchat",
      accountId: input.accountId,
      peerId: input.peerId,
      kind: input.kind ?? "direct",
      threadId: input.threadId,
      text: input.text,
      timestamp: input.timestamp ?? Date.now(),
    };
    const resolved = this.runtime.resolveInbound(message, this.bindings, this.routerOptions);
    const requestId = randomUUID();
    let runId = "";

    const output = await new Promise<string>(async (resolve, reject) => {
      const finishedByRunId = new Map<string, string>();
      const stop = this.runtime.onEvent((event) => {
        if (event.event === "agent.finished") {
          finishedByRunId.set(event.payload.runId, event.payload.text);
          if (runId && event.payload.runId === runId) {
            clearTimeout(timer);
            stop();
            resolve(event.payload.text);
          }
        }
      });

      const timer = setTimeout(() => {
        stop();
        reject(new Error("Timed out waiting for agent.finished"));
      }, 5_000);

      try {
        const response = await this.runtime.handleRequest({
          type: "req",
          id: requestId,
          method: "agent.run",
          params: {
            sessionKey: resolved.sessionKey,
            message: input.text,
            agentId: resolved.agentId,
          },
        });
        if (!response.ok) {
          clearTimeout(timer);
          stop();
          reject(new Error(response.error.message));
          return;
        }
        runId = response.payload.runId;
        const finished = finishedByRunId.get(runId);
        if (finished) {
          clearTimeout(timer);
          stop();
          resolve(finished);
        }
      } catch (error) {
        clearTimeout(timer);
        stop();
        reject(error);
      }
    });

    return {
      agentId: resolved.agentId,
      sessionKey: resolved.sessionKey,
      text: output,
    };
  }
}
