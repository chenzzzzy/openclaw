import { describe, expect, it } from "vitest";
import { InMemorySessionStore, deterministicSessionId } from "./session-store.js";

describe("session-store", () => {
  it("generates deterministic session ids from session key", () => {
    const key = "agent:main:main";
    expect(deterministicSessionId(key)).toBe(deterministicSessionId(key));
    expect(deterministicSessionId(key)).toMatch(/^sess_[a-f0-9]{16}$/);
  });

  it("returns a stable record for getOrCreate and updates on upsert", () => {
    const store = new InMemorySessionStore(() => 123);
    const first = store.getOrCreate("agent:main:main");
    const second = store.getOrCreate("agent:main:main");

    expect(second.sessionId).toBe(first.sessionId);
    expect(second.updatedAt).toBe(123);

    const updated = store.upsert("agent:main:main", { summary: "done" });
    expect(updated.summary).toBe("done");
    expect(updated.updatedAt).toBe(123);
  });
});
