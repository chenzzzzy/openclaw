import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition } from "./registry.js";
import type { SessionStore } from "../store/session-store.js";
import type { InMemoryRetriever } from "../memory/retrieval.js";

const execFileAsync = promisify(execFile);

type BuiltinDeps = {
  workspaceRoot: string;
  sessions?: SessionStore;
  memory?: InMemoryRetriever;
  sendSessionMessage?: (sessionKey: string, message: string) => Promise<void>;
};

export function createBuiltinTools(deps: BuiltinDeps): ToolDefinition[] {
  return [
    {
      name: "read_file",
      description: "Read UTF-8 file from workspace",
      schema: { path: "string" },
      async execute(input) {
        const fullPath = resolveWorkspacePath(deps.workspaceRoot, String(input.path ?? ""));
        const content = await readFile(fullPath, "utf8");
        return { path: fullPath, content };
      },
    },
    {
      name: "write_file",
      description: "Write UTF-8 file into workspace",
      schema: { path: "string", content: "string" },
      async execute(input) {
        const fullPath = resolveWorkspacePath(deps.workspaceRoot, String(input.path ?? ""));
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, String(input.content ?? ""), "utf8");
        return { path: fullPath, written: true };
      },
    },
    {
      name: "shell",
      description: "Run PowerShell command with timeout",
      schema: { command: "string", timeoutMs: "number?" },
      async execute(input) {
        const command = String(input.command ?? "");
        const timeoutMs = Number(input.timeoutMs ?? 5_000);
        const result = await execFileAsync(
          "powershell",
          ["-NoProfile", "-Command", command],
          { timeout: timeoutMs, windowsHide: true, cwd: deps.workspaceRoot },
        );
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          code: 0,
        };
      },
    },
    {
      name: "web_search",
      description: "Stub web search in local-first mode",
      schema: { query: "string" },
      async execute(input) {
        return {
          query: String(input.query ?? ""),
          ok: false,
          reason: "WEB_SEARCH_NOT_IMPLEMENTED_IN_LOCAL_CORE",
        };
      },
    },
    {
      name: "memory_search",
      description: "Search memory chunks with hybrid score",
      schema: { query: "string", sessionKey: "string?", limit: "number?" },
      async execute(input) {
        if (!deps.memory) {
          return { hits: [], reason: "MEMORY_NOT_CONFIGURED" };
        }
        const hits = deps.memory.search({
          query: String(input.query ?? ""),
          sessionKey: input.sessionKey ? String(input.sessionKey) : undefined,
          limit: input.limit ? Number(input.limit) : undefined,
        });
        return { hits };
      },
    },
    {
      name: "sessions_list",
      description: "List known sessions",
      async execute() {
        return { sessions: deps.sessions?.list() ?? [] };
      },
    },
    {
      name: "sessions_send",
      description: "Send a message into another session",
      schema: { sessionKey: "string", message: "string" },
      async execute(input) {
        const sessionKey = String(input.sessionKey ?? "");
        const message = String(input.message ?? "");
        if (!deps.sendSessionMessage) {
          return { ok: false, reason: "SESSION_SEND_NOT_CONFIGURED", sessionKey };
        }
        await deps.sendSessionMessage(sessionKey, message);
        return { ok: true, sessionKey };
      },
    },
  ];
}

function resolveWorkspacePath(workspaceRoot: string, userPath: string): string {
  const fullPath = resolve(workspaceRoot, userPath);
  const root = resolve(workspaceRoot);
  if (!fullPath.startsWith(root)) {
    throw new Error("Path escapes workspace root.");
  }
  return fullPath;
}
