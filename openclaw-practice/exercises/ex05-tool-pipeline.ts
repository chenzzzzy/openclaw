/**
 * 练习题 5：工具调用（Function Calling）管线
 *
 * 背景：
 * Agent 的工具系统需要处理：
 * 1. 类型安全的参数解析（LLM 传来的参数可能类型不对）
 * 2. 权限控制（某些工具只有 owner 才能用）
 * 3. 错误分类（参数错误 400 vs 权限错误 403 vs 运行时错误 500）
 * 4. ActionGate 模式（工具内的细粒度动作控制）
 *
 * 任务 1：实现 readStringParam（安全读取字符串参数）
 * 任务 2：实现 createActionGate（动作级权限控制）
 * 任务 3：实现 executeToolCall（完整的工具调用管线）
 */

// ============================================================
// 类型定义
// ============================================================

export class ToolInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export class ToolAuthorizationError extends ToolInputError {
  override readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ToolAuthorizationError";
  }
}

export type ToolResult =
  | { type: "success"; data: unknown }
  | { type: "error"; message: string; status: number };

export type AgentTool = {
  name: string;
  ownerOnly?: boolean;
  execute: (input: Record<string, unknown>, context: ExecutionContext) => Promise<unknown>;
};

export type ExecutionContext = {
  senderIsOwner: boolean;
};

export type StringParamOptions = {
  required?: boolean;
  trim?: boolean;
  minLength?: number;
  maxLength?: number;
};

// ============================================================
// 练习 5.1：实现 readStringParam
// ============================================================

/**
 * 从工具输入中安全读取字符串参数
 *
 * 验证规则：
 * - 如果 required=true 且值不存在（undefined/null）或为空字符串：抛出 ToolInputError
 * - 如果 trim=true：去掉首尾空格后再验证
 * - 如果 minLength 设置：长度不足时抛出 ToolInputError
 * - 如果 maxLength 设置：长度超出时抛出 ToolInputError
 * - 如果参数存在但不是字符串类型：抛出 ToolInputError
 *
 * @returns 验证后的字符串，或 undefined（参数不存在且 required=false）
 *
 * @example
 * readStringParam({ name: "  Alice  " }, "name", { required: true, trim: true })
 * // → "Alice"
 *
 * readStringParam({}, "name", { required: true })
 * // → throws ToolInputError("Parameter 'name' is required")
 *
 * readStringParam({ query: "hello" }, "query", { maxLength: 3 })
 * // → throws ToolInputError("Parameter 'query' must be at most 3 characters")
 */
export function readStringParam(
  input: Record<string, unknown>,
  key: string,
  options?: StringParamOptions,
): string | undefined {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 5.2：实现 createActionGate
// ============================================================

/**
 * 创建动作级权限控制门控函数
 *
 * 使用场景：工具内部的某些"动作"可以被单独禁用
 * 例如：sessions 工具可以有 create/delete/read 三个动作，
 * 管理员可以单独禁用 delete 动作
 *
 * @param actions - 动作配置对象（key: 动作名, value: 是否允许）
 * @returns 门控函数：(key, defaultValue?) => boolean
 *
 * @example
 * const gate = createActionGate({ create: true, delete: false });
 * gate("create")           // → true
 * gate("delete")           // → false
 * gate("read")             // → true（默认值 true）
 * gate("read", false)      // → true（配置未设置时才用 defaultValue）
 * // 等等，这里 actions 里没有 "read"，所以用 defaultValue false → false
 * // 让我重新说明：
 * // gate("read", false) → false（defaultValue=false，因为 actions.read 未设置）
 *
 * const gate2 = createActionGate(undefined);
 * gate2("anything")        // → true（undefined 时全部默认允许）
 */
export function createActionGate(
  actions: Record<string, boolean | undefined> | undefined,
): (key: string, defaultValue?: boolean) => boolean {
  // TODO: 实现此函数
  // 提示：
  // 返回一个函数，该函数：
  // 1. 如果 actions[key] 不是 undefined，返回 actions[key]
  // 2. 否则返回 defaultValue（默认为 true）
  throw new Error("Not implemented");
}

// ============================================================
// 练习 5.3：实现 executeToolCall
// ============================================================

/**
 * 执行一次工具调用，处理所有错误情况
 *
 * 执行流程：
 * 1. 查找工具（不存在则返回 error）
 * 2. 权限检查（ownerOnly && !context.senderIsOwner 则返回 403 error）
 * 3. 执行工具（捕获所有异常）
 * 4. ToolInputError (400) → 返回 error（让 LLM 修正参数）
 * 5. ToolAuthorizationError (403) → 返回 error（权限拒绝）
 * 6. 其他异常 → 返回 error（内部错误）
 * 7. 成功 → 返回 success
 *
 * @param toolName - 工具名称
 * @param toolInput - 工具参数（来自 LLM）
 * @param tools - 可用工具列表
 * @param context - 执行上下文（senderIsOwner 等）
 */
export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  tools: AgentTool[],
  context: ExecutionContext,
): Promise<ToolResult> {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

async function runTests() {
  console.log("=== 练习 5.1：readStringParam ===\n");

  // 测试 1：正常读取 + trim
  const r1 = readStringParam({ name: "  Alice  " }, "name", { required: true, trim: true });
  console.assert(r1 === "Alice", `❌ 期望 "Alice"，得到 "${r1}"`);
  console.log(`✅ 读取带空格的字符串: "${r1}"`);

  // 测试 2：required=true 但参数不存在
  try {
    readStringParam({}, "name", { required: true });
    console.log("❌ 应抛出 ToolInputError");
  } catch (e) {
    console.assert(e instanceof ToolInputError, "❌ 应抛出 ToolInputError");
    console.assert((e as ToolInputError).status === 400, "❌ 状态码应为 400");
    console.log(`✅ required 验证: ${e.message}`);
  }

  // 测试 3：maxLength 超出
  try {
    readStringParam({ q: "hello world" }, "q", { maxLength: 5 });
    console.log("❌ 应抛出 ToolInputError");
  } catch (e) {
    console.assert(e instanceof ToolInputError, "❌ 应抛出 ToolInputError");
    console.log(`✅ maxLength 验证: ${e.message}`);
  }

  // 测试 4：参数不存在且 required=false，返回 undefined
  const r4 = readStringParam({}, "optional", { required: false });
  console.assert(r4 === undefined, `❌ 期望 undefined，得到 "${r4}"`);
  console.log(`✅ optional 参数不存在: ${r4}`);

  console.log("\n=== 练习 5.2：createActionGate ===\n");

  const gate = createActionGate({ create: true, delete: false });
  console.assert(gate("create") === true, "❌ create 应为 true");
  console.assert(gate("delete") === false, "❌ delete 应为 false");
  console.assert(gate("read") === true, "❌ 未配置的动作默认为 true");
  console.assert(gate("write", false) === false, "❌ 未配置 + defaultValue=false 应为 false");
  console.log(`✅ ActionGate: create=${gate("create")}, delete=${gate("delete")}, read=${gate("read")}, write(default=false)=${gate("write", false)}`);

  const gate2 = createActionGate(undefined);
  console.assert(gate2("anything") === true, "❌ undefined actions 全部默认 true");
  console.log(`✅ undefined actions: anything=${gate2("anything")}`);

  console.log("\n=== 练习 5.3：executeToolCall ===\n");

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

  // 测试 5：正常调用
  const r5 = await executeToolCall("search", { query: "hello" }, tools, { senderIsOwner: false });
  console.assert(r5.type === "success", `❌ 期望 success，得到 ${r5.type}`);
  console.log(`✅ 正常调用: ${JSON.stringify(r5)}`);

  // 测试 6：工具不存在
  const r6 = await executeToolCall("unknown_tool", {}, tools, { senderIsOwner: false });
  console.assert(r6.type === "error", `❌ 期望 error`);
  console.log(`✅ 工具不存在: ${(r6 as { type: "error"; message: string }).message}`);

  // 测试 7：ownerOnly，非 owner 调用
  const r7 = await executeToolCall("admin_tool", {}, tools, { senderIsOwner: false });
  console.assert(r7.type === "error", `❌ 期望 error`);
  console.assert((r7 as { type: "error"; status: number }).status === 403, "❌ 应为 403");
  console.log(`✅ ownerOnly 拒绝: status=${(r7 as { type: "error"; status: number }).status}`);

  // 测试 8：ownerOnly，owner 调用
  const r8 = await executeToolCall("admin_tool", {}, tools, { senderIsOwner: true });
  console.assert(r8.type === "success", `❌ owner 调用应成功`);
  console.log(`✅ ownerOnly owner 调用成功`);

  // 测试 9：参数错误（required 字段缺失）
  const r9 = await executeToolCall("search", {}, tools, { senderIsOwner: false });
  console.assert(r9.type === "error", `❌ 参数错误应返回 error`);
  console.assert((r9 as { type: "error"; status: number }).status === 400, "❌ 应为 400");
  console.log(`✅ 参数错误: status=${(r9 as { type: "error"; status: number }).status}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
