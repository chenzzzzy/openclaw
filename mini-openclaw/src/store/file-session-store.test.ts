import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { FileSessionStore } from "./file-session-store.js";

describe("FileSessionStore", () => {
  it("persists and reloads sessions from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "mini-openclaw-store-"));
    try {
      const file = join(dir, "sessions.json");
      const store = new FileSessionStore(file, () => 111);
      store.upsert("agent:main:main", { summary: "hello" });

      const reloaded = new FileSessionStore(file, () => 222);
      const record = reloaded.get("agent:main:main");
      expect(record?.summary).toBe("hello");
      expect(record?.sessionId).toMatch(/^sess_[a-f0-9]{16}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
