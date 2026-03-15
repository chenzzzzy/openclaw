import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createBuiltinTools } from "./builtins.js";
import { ToolRegistry } from "./registry.js";
import { InMemorySessionStore } from "../store/session-store.js";
import { InMemoryRetriever } from "../memory/retrieval.js";

describe("builtin tools", () => {
  it("supports file/session/memory tools", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mini-openclaw-tools-"));
    try {
      const sessions = new InMemorySessionStore(() => 1);
      sessions.getOrCreate("agent:main:main");
      const memory = new InMemoryRetriever();
      memory.add({
        id: "m1",
        sessionKey: "agent:main:main",
        text: "remember alpha",
        timestamp: 1,
      });

      const sends: Array<{ sessionKey: string; message: string }> = [];
      const registry = new ToolRegistry();
      for (const tool of createBuiltinTools({
        workspaceRoot: dir,
        sessions,
        memory,
        sendSessionMessage: async (sessionKey, message) => {
          sends.push({ sessionKey, message });
        },
      })) {
        registry.register(tool);
      }

      const write = await registry.execute({
        name: "write_file",
        input: { path: "notes/a.txt", content: "hello" },
      });
      expect(write.ok).toBe(true);

      const read = await registry.execute({
        name: "read_file",
        input: { path: "notes/a.txt" },
      });
      expect(read.ok).toBe(true);
      if (read.ok) {
        expect(String((read.output as { content: string }).content)).toBe("hello");
      }

      const list = await registry.execute({
        name: "sessions_list",
        input: {},
      });
      expect(list.ok).toBe(true);

      const search = await registry.execute({
        name: "memory_search",
        input: { query: "alpha", sessionKey: "agent:main:main" },
      });
      expect(search.ok).toBe(true);

      const send = await registry.execute({
        name: "sessions_send",
        input: { sessionKey: "agent:main:main", message: "ping" },
      });
      expect(send.ok).toBe(true);
      expect(sends).toEqual([{ sessionKey: "agent:main:main", message: "ping" }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
