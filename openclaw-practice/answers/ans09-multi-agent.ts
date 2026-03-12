/**
 * 标准答案 9：多 Agent 编排
 */

export type AgentTask = {
  id: string; task: string; agentId?: string; timeoutMs?: number;
};
export type AgentResult = {
  taskId: string; success: boolean; output?: string; error?: string; durationMs: number;
};
export type OrchestratorResult = {
  results: AgentResult[]; successCount: number; failureCount: number; totalDurationMs: number;
};
export type AgentExecutor = (task: AgentTask) => Promise<string>;

/**
 * 构造子 Agent Session Key
 * 格式：{parentSessionKey}:subagent:{label|agentId|"sub"}
 */
export function buildSubagentSessionKey(params: {
  parentSessionKey: string;
  agentId?: string;
  label?: string;
}): string {
  const identifier = params.label ?? params.agentId ?? "sub";
  return `${params.parentSessionKey}:subagent:${identifier}`;
}

/**
 * 从 Session Key 获取子 Agent 嵌套深度
 * 计数 ":subagent:" 出现次数
 */
export function getSubagentDepth(sessionKey: string): number {
  const matches = sessionKey.match(/:subagent:/g);
  return matches ? matches.length : 0;
}

/**
 * 多 Agent 任务编排器
 */
export async function orchestrate(params: {
  parentSessionKey: string;
  tasks: AgentTask[];
  executor: AgentExecutor;
  maxDepth?: number;
}): Promise<OrchestratorResult> {
  const maxDepth = params.maxDepth ?? 2;
  const currentDepth = getSubagentDepth(params.parentSessionKey);
  const startTime = Date.now();

  // 深度检查：超过最大深度则拒绝所有任务
  if (currentDepth >= maxDepth) {
    const results: AgentResult[] = params.tasks.map(task => ({
      taskId: task.id,
      success: false,
      error: `Max subagent depth (${maxDepth}) exceeded. Current depth: ${currentDepth}`,
      durationMs: 0,
    }));
    return {
      results,
      successCount: 0,
      failureCount: results.length,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * 执行单个任务（带超时控制）
   */
  async function executeWithTimeout(task: AgentTask): Promise<AgentResult> {
    const taskStart = Date.now();

    const executionPromise = params.executor(task).then(
      output => ({ taskId: task.id, success: true, output, durationMs: Date.now() - taskStart }),
      error => ({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - taskStart,
      })
    );

    // 如果没有设置超时，直接执行
    if (!task.timeoutMs) return executionPromise;

    // 创建超时 Promise
    const timeoutPromise = new Promise<AgentResult>((resolve) => {
      setTimeout(() => {
        resolve({
          taskId: task.id,
          success: false,
          error: `Task timeout after ${task.timeoutMs}ms`,
          durationMs: task.timeoutMs!,
        });
      }, task.timeoutMs);
    });

    // 竞争：谁先完成用谁的结果
    return Promise.race([executionPromise, timeoutPromise]);
  }

  // 并发执行所有任务（Promise.allSettled 保证全部完成，不因单个失败中断）
  const settled = await Promise.allSettled(
    params.tasks.map(task => executeWithTimeout(task))
  );

  // 提取结果（allSettled 不会 reject，每个都是 fulfilled 或 rejected）
  const results: AgentResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    // executeWithTimeout 内部已捕获所有错误，理论上不会 rejected
    return {
      taskId: params.tasks[i].id,
      success: false,
      error: `Unexpected error: ${s.reason}`,
      durationMs: 0,
    };
  });

  const successCount = results.filter(r => r.success).length;

  return {
    results,
    successCount,
    failureCount: results.length - successCount,
    totalDurationMs: Date.now() - startTime,
  };
}

// ============================================================
// 测试验证
// ============================================================

async function runTests() {
  console.log("=== 答案 9 测试 ===\n");

  // buildSubagentSessionKey
  const k1 = buildSubagentSessionKey({ parentSessionKey: "agent:main:telegram:dm:123", agentId: "coder" });
  console.assert(k1 === "agent:main:telegram:dm:123:subagent:coder", `❌ ${k1}`);
  console.log(`✅ 一级 key: ${k1}`);

  const k2 = buildSubagentSessionKey({ parentSessionKey: k1, label: "test-runner" });
  console.assert(k2.endsWith(":subagent:coder:subagent:test-runner"), `❌ ${k2}`);
  console.log(`✅ 二级 key: ${k2}`);

  // getSubagentDepth
  console.assert(getSubagentDepth("agent:main:telegram:dm:123") === 0);
  console.assert(getSubagentDepth(k1) === 1);
  console.assert(getSubagentDepth(k2) === 2);
  console.log(`✅ 深度: 0, 1, 2`);

  // orchestrate
  const executor: AgentExecutor = async (task) => {
    await new Promise(resolve => setTimeout(resolve, 10));
    if (task.task.includes("fail")) throw new Error("Simulated failure");
    return `Done: ${task.task}`;
  };

  // 正常并发
  const r1 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [{ id: "t1", task: "search" }, { id: "t2", task: "summarize" }],
    executor,
  });
  console.assert(r1.successCount === 2 && r1.failureCount === 0);
  console.log(`✅ 并发执行: ${r1.successCount} 成功`);

  // 部分失败
  const r2 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [{ id: "t1", task: "ok" }, { id: "t2", task: "fail" }],
    executor,
  });
  console.assert(r2.successCount === 1 && r2.failureCount === 1);
  console.log(`✅ 部分失败: ${r2.failureCount} 个失败`);

  // 超时
  const r3 = await orchestrate({
    parentSessionKey: "agent:main:telegram:dm:123",
    tasks: [{ id: "t1", task: "slow", timeoutMs: 5 }],
    executor: async () => { await new Promise(r => setTimeout(r, 200)); return "slow"; },
  });
  console.assert(r3.failureCount === 1 && r3.results[0].error?.includes("timeout"));
  console.log(`✅ 超时: ${r3.results[0].error}`);

  // 深度超限
  const deepKey = "agent:main:dm:123:subagent:a:subagent:b";
  const r4 = await orchestrate({
    parentSessionKey: deepKey,
    tasks: [{ id: "t1", task: "deep" }],
    executor,
    maxDepth: 2,
  });
  console.assert(r4.failureCount === 1);
  console.log(`✅ 深度超限: ${r4.results[0].error}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
