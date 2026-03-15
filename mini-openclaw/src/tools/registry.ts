import type { ToolCall, ToolExecutor, ToolResult } from "../agent/runtime.js";

export type ToolDefinition = {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<unknown>;
};

export type ToolAuditLike = {
  append(entry: {
    timestamp: number;
    call: ToolCall;
    result: ToolResult;
  }): void;
};

export class ToolRegistry implements ToolExecutor {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(
    private readonly auditLog?: ToolAuditLike,
    private readonly now: () => number = () => Date.now(),
  ) {}

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  list(): string[] {
    return [...this.tools.keys()].sort();
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      const missing: ToolResult = {
        name: call.name,
        ok: false,
        output: { error: "TOOL_NOT_FOUND" },
      };
      this.auditLog?.append({
        timestamp: this.now(),
        call,
        result: missing,
      });
      return missing;
    }

    try {
      const output = await tool.execute(call.input);
      const success: ToolResult = {
        name: call.name,
        ok: true,
        output,
      };
      this.auditLog?.append({
        timestamp: this.now(),
        call,
        result: success,
      });
      return success;
    } catch (error) {
      const failure: ToolResult = {
        name: call.name,
        ok: false,
        output: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
      this.auditLog?.append({
        timestamp: this.now(),
        call,
        result: failure,
      });
      return failure;
    }
  }
}
