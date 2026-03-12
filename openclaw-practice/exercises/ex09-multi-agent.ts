/**
 * 练习题 9：多 Agent 编排（Subagent Spawning）
 *
 * 背景：
 * 复杂任务需要多个专门 Agent 协作完成。
 * 编排器（Orchestrator）负责任务分解、子 Agent 调度和结果聚合。
 * 关键工程问题：隔离性、超时控制、并发安全、深度限制。
 *
 * 任务 1：实现 buildSubagentSessionKey（子 Agent 的 session key 包含层级信息）
 * 任务 2：实现 getSubagentDepth（从 session key 解析嵌套深度）
 * 任务 3：实现 orchestrate（多 Agent 任务编排器）
 */

// ============================================================
// 类型定义
// ============================================================

export type AgentTask = {
  id: string;
  task: string;
  agentId?: string;
  timeoutMs?: number;
};

export type AgentResult = {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
};

export type OrchestratorResult = {
  results: AgentResult[];
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
};

// 模拟的子 Agent 执行器
export type AgentExecutor = (task: AgentTask) => Promise<string>;

// ============================================================
// 练习 9.1：实现 buildSubagentSessionKey
// ============================================================

/**
 * 构造子 Agent 的 Session Key
 *
 * 格式：{parentSessionKey}:subagent:{label}
 * 其中 label 如果未提供，则使用 agentId，如果 agentId 也没有则用 "sub"
 *
 * @example
 * buildSubagentSessionKey({
 *   parentSessionKey: "agent:main:telegram:dm:123",
 *   agentId: "coder",
 * })
 * // → "agent:main:telegram:dm:123:subagent:coder"
 *
 * buildSubagentSessionKey({
 *   parentSessionKey: "agent:main:telegram:dm:123:subagent:coder",
 *   label: "test-runner",
 * })
 * // → "agent:main:telegram:dm:123:subagent:coder:subagent:test-runner"
 */
export function buildSubagentSessionKey(params: {
  parentSessionKey: string;
  agentId?: string;
  label?: string;
}): string {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 9.2：实现 getSubagentDepth
// ============================================================

/**
 * 从 Session Key 获取子 Agent 嵌套深度
 * 深度 = session key 中 ":subagent:" 出现的次数
 *
 * @example
 * getSubagentDepth("agent:main:telegram:dm:123")
 * // → 0（不是子 Agent）
 *
 * getSubagentDepth("agent:main:telegram:dm:123:subagent:coder")
 * // → 1（一级子 Agent）
 *
 * getSubagentDepth("agent:main:telegram:dm:123:subagent:coder:subagent:test")
 * // → 2（二级子 Agent）
 */
export function getSubagentDepth(sessionKey: string): number {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 9.3：实现 orchestrate
// ============================================================

/**
 * 多 Agent 任务编排器
 *
 * 功能：
 * 1. 并发执行多个子 Agent 任务（使用 Promise.allSettled）
 * 2. 每个任务有独立的超时控制
 * 3. 深度检查：如果当前深度 >= maxDepth，拒绝执行
 * 4. 聚合所有结果（包括失败的）
 * 5. 返回统计信息（成功数、失败数、总耗时）
 *
 * 超时处理：
 * - 如果 task.timeoutMs 设置，在超时后取消该任务
 * - 超时的任务记为失败，error = "Task timeout after Xms"
 *
 * @param parentSessionKey - 父 Agent 的 session key（用于深度检查）
 * @param tasks - 要并发执行的任务列表
 * @param executor - 执行单个任务的函数
 * @param maxDepth - 最大嵌套深度（默认 2）
 */
export async function orchestrate(params: {
  parentSessionKey: string;
  tasks: AgentTask[];
  executor: AgentExecutor;
  maxDepth?: number;
}): Promise<OrchestratorResult> {
  // TODO: 实现此函数
  // 提示：
  // 1. 检查深度 getSubagentDepth(parentSessionKey) >= maxDepth 则拒绝
  // 2. 用 Promise.allSettled 并发执行所有任务
  // 3. 每个任务：创建超时 Promise，用 Promise.race 实现超时控制
  // 4. 记录每个任务的开始时间和结束时间
  // 5. 汇总结果
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

async function runTests() {
  console.log("=== 练习 9.1：buildSubagentSessionKey ===\n");

  const k1 = buildSubagentSessionKey({
    parentSessionKey: "agent:main:telegram:dm:123",
    agentId: "coder",
  });
  console.assert(
    k1 === "agent:main:telegram:dm:123:subagent:coder",
    `❌ 期望 "..:subagent:coder"，得到 "${k1}"`
  );
  console.log(`✅ 一级子 Agent key: ${k1}`);

  const k2 = buildSubagentSessionKey({
    parentSessionKey: k1,
    label: "test-runner",
  });
  console.assert(
    k2 === "agent:main:telegram:dm:123:subagent:coder:subagent:test-runner",
    `❌ 期望二级子 Agent key，得到 "${k2}"`
  );
  console.log(`✅ 二级子 Agent key: ${k2}`);

  const k3 = buildSubagentSessionKey({
    parentSessionKey: "agent:main:telegram:dm:123",
    // 没有 agentId 和 label
  });
  console.assert(k3.endsWith(":subagent:sub"), `❌ 没有 agentId/label 时应用 "sub"，得到 "${k3}"`);
  console.log(`✅ 无 label key: ${k3}`);

  console.log("\n=== 练习 9.2：getSubagentDepth ===\n");

  console.assert(getSubagentDepth("agent:main:telegram:dm:123") === 0, "❌ 深度应为 0");
  console.assert(getSubagentDepth(k1) === 1, `❌ 深度应为 1，得到 ${getSubagentDepth(k1)}`);
  console.assert(getSubagentDepth(k2) === 2, `❌ 深度应为 2，得到 ${getSubagentDepth(k2)}`);
  console.log(`✅ 深度: 无sub=0, 一级=${getSubagentDepth(k1)}, 二级=${getSubagentDepth(k2)}`);

  console.log("\n=== 练习 9.3：orchestrate ===\n");

  // 模拟执行器
  const executor: AgentExecutor = async (task) => {
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 10));
    if (task.task.includes("fail")) {
      throw new Error("Simulated failure");
    }
    return `Done: ${task.task}`;
  };

  // 测试 1：正常并发执行
  const result1 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [
      { id: "t1", task: "search news" },
      { id: "t2", task: "summarize" },
      { id: "t3", task: "write report" },
    ],
    executor,
  });

  console.assert(result1.successCount === 3, `❌ 期望 3 个成功，得到 ${result1.successCount}`);
  console.assert(result1.failureCount === 0, `❌ 期望 0 个失败，得到 ${result1.failureCount}`);
  console.assert(result1.results.length === 3, `❌ 期望 3 个结果`);
  console.log(`✅ 并发执行: ${result1.successCount} 成功, ${result1.failureCount} 失败, 耗时 ${result1.totalDurationMs}ms`);

  // 测试 2：部分失败
  const result2 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [
      { id: "t1", task: "search" },
      { id: "t2", task: "fail please" },  // 这个会失败
    ],
    executor,
  });

  console.assert(result2.successCount === 1, `❌ 期望 1 个成功`);
  console.assert(result2.failureCount === 1, `❌ 期望 1 个失败`);
  const failedTask = result2.results.find(r => !r.success);
  console.assert(failedTask !== undefined, "❌ 应有失败的任务");
  console.assert(failedTask!.taskId === "t2", `❌ 失败任务应为 t2`);
  console.log(`✅ 部分失败: ${result2.successCount} 成功, ${result2.failureCount} 失败`);

  // 测试 3：超时控制
  const slowExecutor: AgentExecutor = async (task) => {
    await new Promise(resolve => setTimeout(resolve, 200));  // 200ms
    return "slow result";
  };

  const result3 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [{ id: "t1", task: "slow task", timeoutMs: 50 }],  // 50ms 超时
    executor: slowExecutor,
  });

  console.assert(result3.failureCount === 1, "❌ 超时任务应记为失败");
  const timedOut = result3.results[0];
  console.assert(timedOut.error?.includes("timeout") || timedOut.error?.includes("50"), 
    `❌ 超时错误信息应包含 "timeout"，得到 "${timedOut.error}"`);
  console.log(`✅ 超时控制: ${timedOut.error}`);

  // 测试 4：深度超限
  const deepKey = "agent:main:dm:123:subagent:a:subagent:b";  // 深度 2
  const result4 = await orchestrate({
    parentSessionKey: deepKey,
    tasks: [{ id: "t1", task: "deep task" }],
    executor,
    maxDepth: 2,  // 深度 2 时不允许再 spawn
  });

  console.assert(result4.failureCount === 1, "❌ 超过深度限制应拒绝执行");
  console.assert(result4.results[0].error?.includes("depth") || result4.results[0].error?.includes("深度") ||
    result4.results[0].error?.includes("max"),
    `❌ 深度超限错误信息不对: "${result4.results[0].error}"`);
  console.log(`✅ 深度超限: ${result4.results[0].error}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
