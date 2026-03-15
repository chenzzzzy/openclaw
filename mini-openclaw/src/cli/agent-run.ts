import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import WebSocket from "ws";
import type { GatewayEvent } from "../gateway/protocol.js";

type CliOptions = {
  url: string;
  sessionKey: string;
  message: string;
  agentId?: string;
};

export async function runAgentCli(options: CliOptions): Promise<string> {
  const socket = new WebSocket(options.url);
  const requestId = randomUUID();
  let runId = "";

  return await new Promise<string>((resolve, reject) => {
    const finishedByRunId = new Map<string, string>();
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for agent response"));
      socket.close();
    }, 10_000);

    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "req",
          id: requestId,
          method: "agent.run",
          params: {
            sessionKey: options.sessionKey,
            message: options.message,
            agentId: options.agentId,
          },
        }),
      );
    });

    socket.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString()) as
        | { type: "res"; id: string; ok: boolean; payload?: { runId: string; accepted: true }; error?: { message: string } }
        | GatewayEvent;

      if (parsed.type === "res" && parsed.id === requestId) {
        if (!parsed.ok) {
          clearTimeout(timeout);
          reject(new Error(parsed.error?.message ?? "Request rejected"));
          socket.close();
          return;
        }
        runId = parsed.payload?.runId ?? "";
        const finished = finishedByRunId.get(runId);
        if (finished) {
          clearTimeout(timeout);
          resolve(finished);
          socket.close();
        }
        return;
      }

      if (parsed.type !== "event") {
        return;
      }
      if (parsed.event === "agent.delta") {
        if (runId && parsed.payload.runId === runId) {
          process.stdout.write(`${parsed.payload.text}\n`);
        }
      }
      if (parsed.event === "agent.finished") {
        finishedByRunId.set(parsed.payload.runId, parsed.payload.text);
        if (runId && parsed.payload.runId === runId) {
          clearTimeout(timeout);
          resolve(parsed.payload.text);
          socket.close();
        }
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseCliArgs(process.argv.slice(2));
  runAgentCli(options)
    .then((text) => {
      process.stdout.write(`final: ${text}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}

function parseCliArgs(args: string[]): CliOptions {
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    map.set(args[i] ?? "", args[i + 1] ?? "");
  }
  const url = map.get("--url") ?? "ws://127.0.0.1:18789";
  const sessionKey = map.get("--session") ?? "agent:main:main";
  const message = map.get("--message") ?? "hello";
  const agentId = map.get("--agent");
  return { url, sessionKey, message, agentId };
}
