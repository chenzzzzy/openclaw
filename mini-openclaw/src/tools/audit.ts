import type { ToolCall, ToolResult } from "../agent/runtime.js";

export type ToolAuditEntry = {
  timestamp: number;
  call: ToolCall;
  result: ToolResult;
};

export class InMemoryToolAuditLog {
  private readonly entries: ToolAuditEntry[] = [];

  append(entry: ToolAuditEntry): void {
    this.entries.push(entry);
  }

  list(): ToolAuditEntry[] {
    return [...this.entries];
  }
}
