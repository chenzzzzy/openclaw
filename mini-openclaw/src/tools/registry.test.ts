import { describe, expect, it } from "vitest";
import { InMemoryToolAuditLog } from "./audit.js";
import { ToolRegistry } from "./registry.js";

describe("ToolRegistry", () => {
  it("records audit entries for execute", async () => {
    const audit = new InMemoryToolAuditLog();
    const registry = new ToolRegistry(audit, () => 99);
    registry.register({
      name: "echo",
      description: "echo",
      async execute(input) {
        return input;
      },
    });

    const result = await registry.execute({ name: "echo", input: { x: 1 } });
    expect(result.ok).toBe(true);
    const entries = audit.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.timestamp).toBe(99);
    expect(entries[0]?.call.name).toBe("echo");
  });
});
