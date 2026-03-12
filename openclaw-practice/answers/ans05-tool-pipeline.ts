/**
 * 标准答案 5：工具调用管线
 */

export class ToolInputError extends Error {
  readonly status = 400;
  constructor(message: string) { super(message); this.name = "ToolInputError"; }
}
export class ToolAuthorizationError extends ToolInputError {
  override readonly status = 403;
  constructor(message: string) { super(message); this.name = "ToolAuthorizationError"; }
}

export type ToolResult =
  | { type: "success"; data: unknown }
  | { type: "error"; message: string; status: number };
export type AgentTool = {
  name: string;
  ownerOnly?: boolean;
  execute: (input: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
};
export type ExecutionContext = { senderIsOwner: boolean };
export type StringParamOptions = {
  required?: boolean; trim?: boolean; minLength?: number; maxLength?: number;
};

/**
 * 安全读取字符串参数
 */
export function readStringParam(
  input: Record<string, unknown>,
  key: string,
  options?: StringParamOptions,
): string | undefined {
  const raw = input[key];

  // 参数不存在
  if (raw === undefined || raw === null) {
    if (options?.required) {
      throw new ToolInputError(`Parameter '${key}' is required`);
    }
    return undefined;
  }

  // 类型检查
  if (typeof raw !== "string") {
    throw new ToolInputError(`Parameter '${key}' must be a string, got ${typeof raw}`);
  }

  let value = options?.trim ? raw.trim() : raw;

  // 空字符串检查
  if (value === "" && options?.required) {
    throw new ToolInputError(`Parameter '${key}' is required`);
  }

  // minLength 检查
  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw new ToolInputError(
      `Parameter '${key}' must be at least ${options.minLength} characters`
    );
  }

  // maxLength 检查
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw new ToolInputError(
      `Parameter '${key}' must be at most ${options.maxLength} characters`
    );
  }

  return value;
}

/**
 * 创建动作级权限控制函数
 */
export function createActionGate(
  actions: Record<string, boolean | undefined> | undefined,
): (key: string, defaultValue?: boolean) => boolean {
  return (key: string, defaultValue = true): boolean => {
    const value = actions?.[key];
    return value === undefined ? defaultValue : value;
  };
}

/**
 * 完整的工具调用执行管线
 */
export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  tools: AgentTool[],
  context: ExecutionContext,
): Promise<ToolResult> {
  // 1. 查找工具
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    return { type: "error", message: `Unknown tool: ${toolName}`, status: 404 };
  }

  // 2. 权限检查
  if (tool.ownerOnly && !context.senderIsOwner) {
    return {
      type: "error",
      message: "Tool restricted to owner senders.",
      status: 403,
    };
  }

  // 3. 执行工具（捕获所有异常）
  try {
    const data = await tool.execute(toolInput, context);
    return { type: "success", data };
  } catch (err) {
    if (err instanceof ToolInputError) {
      // 参数错误（400/403）：返回给 LLM，让它修正参数
      return {
        type: "error",
        message: err.message,
        status: err.status,
      };
    }
    // 内部错误（500）：也返回 error 而不是抛出，保证 Agent 不崩溃
    const message = err instanceof Error ? err.message : String(err);
    return { type: "error", message: `Tool execution failed: ${message}`, status: 500 };
  }
}

// ============================================================
// 测试验证
// ============================================================

async function runTests() {
  console.log("=== 答案 5.1：readStringParam ===\n");

  const r1 = readStringParam({ name: "  Alice  " }, "name", { required: true, trim: true });
  console.assert(r1 === "Alice", `❌ 期望 "Alice"`);
  console.log(`✅ trim: "${r1}"`);

  try {
    readStringParam({}, "name", { required: true });
    console.log("❌ 应抛出");
  } catch (e) {
    console.assert(e instanceof ToolInputError && e.status === 400);
    console.log(`✅ required 验证: ${e.message}`);
  }

  try {
    readStringParam({ q: "hello world" }, "q", { maxLength: 5 });
  } catch (e) {
    console.log(`✅ maxLength 验证: ${e.message}`);
  }

  const r4 = readStringParam({}, "optional");
  console.assert(r4 === undefined);
  console.log(`✅ optional: ${r4}`);

  console.log("\n=== 答案 5.2：createActionGate ===\n");

  const gate = createActionGate({ create: true, delete: false });
  console.assert(gate("create") === true);
  console.assert(gate("delete") === false);
  console.assert(gate("read") === true);      // 未配置，默认 true
  console.assert(gate("write", false) === false); // 未配置，defaultValue=false
  console.log(`✅ create=${gate("create")}, delete=${gate("delete")}, read=${gate("read")}, write(default=false)=${gate("write", false)}`);

  console.log("\n=== 答案 5.3：executeToolCall ===\n");

  const tools: AgentTool[] = [
    {
      name: "search",
      execute: async (input) => {
        const q = readStringParam(input, "query", { required: true });
        return { results: [`Result for: ${q}`] };
      },
    },
    {
      name: "admin_tool",
      ownerOnly: true,
      execute: async () => ({ data: "admin data" }),
    },
  ];

  const r5 = await executeToolCall("search", { query: "hello" }, tools, { senderIsOwner: false });
  console.assert(r5.type === "success");
  console.log(`✅ 正常调用: success`);

  const r6 = await executeToolCall("unknown", {}, tools, { senderIsOwner: false });
  console.assert(r6.type === "error");
  console.log(`✅ 工具不存在: ${(r6 as {message: string}).message}`);

  const r7 = await executeToolCall("admin_tool", {}, tools, { senderIsOwner: false });
  console.assert(r7.type === "error" && (r7 as {status: number}).status === 403);
  console.log(`✅ ownerOnly 拒绝: 403`);

  const r8 = await executeToolCall("admin_tool", {}, tools, { senderIsOwner: true });
  console.assert(r8.type === "success");
  console.log(`✅ owner 调用成功`);

  const r9 = await executeToolCall("search", {}, tools, { senderIsOwner: false });
  console.assert(r9.type === "error" && (r9 as {status: number}).status === 400);
  console.log(`✅ 参数错误: 400`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
