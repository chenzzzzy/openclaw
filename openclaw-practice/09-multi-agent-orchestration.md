# 知识点 9：多 Agent 编排（Subagent Spawning）

## 1. 概念解释

### 什么是多 Agent 编排？

单个 Agent 有能力瓶颈：
- 上下文窗口有限，长任务会超限
- 所有工具串行执行，效率低
- 一个 Agent 很难同时精通所有领域

**多 Agent 编排** 让一个主 Agent（Orchestrator）将任务分解，分派给多个专门的子 Agent（Workers）并行执行：

```
主 Agent（Orchestrator）
  ├── 分析任务
  ├── spawn 子 Agent A：负责搜索信息
  ├── spawn 子 Agent B：负责写代码  
  ├── spawn 子 Agent C：负责测试代码
  └── 汇总结果，返回给用户
```

### OpenClaw 支持的子 Agent 模式

1. **Subagent**：在当前进程内运行的子 Agent（共享内存空间）
2. **ACP（Agent Compute Protocol）**：独立进程中运行的子 Agent（最强隔离性）

---

## 2. OpenClaw 的子 Agent 架构

源码位置：`src/agents/acp-spawn.ts`, `src/agents/subagent-spawn.ts`

### 2.1 Spawn 工具 Schema

```typescript
// src/agents/tools/sessions-spawn-tool.ts

const SessionsSpawnToolSchema = Type.Object({
  task: Type.String(),                          // 要执行的任务描述
  label: Type.Optional(Type.String()),          // 子 Agent 的标识名
  runtime: optionalStringEnum(["subagent", "acp"]),  // 运行时选择
  agentId: Type.Optional(Type.String()),        // 指定特定 Agent 配置
  model: Type.Optional(Type.String()),          // 子 Agent 使用的模型
  thinking: Type.Optional(Type.String()),       // 推理深度
  cwd: Type.Optional(Type.String()),           // 工作目录
  runTimeoutSeconds: Type.Optional(Type.Number()),  // 超时控制
  mode: optionalStringEnum(["run", "session"]), // 单次运行 or 持久会话
  cleanup: optionalStringEnum(["delete", "keep"]), // 完成后清理工作区
  sandbox: optionalStringEnum(["inherit", "require"]),  // 沙箱继承
  streamTo: optionalStringEnum(["parent"]),    // 输出流式传回父 Agent
  
  // 文件附件（快照传递）
  attachments: Type.Optional(Type.Array(Type.Object({
    name: Type.String(),
    content: Type.String(),
    encoding: Type.Optional(Type.String()),
  }), { maxItems: 50 })),
});
```

### 2.2 子 Agent Session Key 设计

子 Agent 有独立的 session key，编码了层级关系：

```
// 子 Agent Session Key 格式
agent:{agentId}:{channel}:subagent:{parentSessionKey}:{subagentId}

示例：
  agent:main:telegram:dm:123:subagent:researcher-task-abc123

// 解析深度（避免无限嵌套）
export function getSubagentDepth(sessionKey: string): number {
  // 计算 "subagent:" 出现次数
  return (sessionKey.match(/subagent:/g) || []).length;
}
```

**防止无限嵌套**：子 Agent 默认最多 2 层深度，超过则拒绝 spawn。

### 2.3 ACP spawn 完整流程

```typescript
// src/agents/acp-spawn.ts（简化版）
export async function spawnAcpDirect(params: {
  task: string;
  agentId?: string;
  model?: string;
  runTimeoutSeconds?: number;
  streamTo?: "parent";
  attachments?: Attachment[];
  parentSessionKey: string;
  config: OpenClawConfig;
}): Promise<SpawnResult> {
  
  // 1. 策略检查：是否允许 spawn？
  const policy = resolveAcpSpawnPolicy(params.config);
  if (!isAcpEnabledByPolicy(policy)) {
    throw new Error(resolveAcpAgentPolicyError(policy));
  }
  
  // 2. 生成子 Session Key
  const childSessionKey = buildSubagentSessionKey({
    parentKey: params.parentSessionKey,
    agentId: params.agentId ?? "main",
    label: params.label,
  });
  
  // 3. 准备工作区（隔离的文件系统空间）
  const workspaceDir = await resolveAcpSessionCwd(params);
  
  // 4. 序列化附件文件到工作区
  if (params.attachments?.length) {
    await materializeAttachments(params.attachments, workspaceDir);
  }
  
  // 5. 获取 ACP 控制平面（管理子进程生命周期）
  const acpManager = getAcpSessionManager();
  
  // 6. 启动子 Agent 进程
  const handle = await acpManager.spawn({
    sessionKey: childSessionKey,
    workspaceDir,
    model: params.model,
    task: params.task,
    timeout: params.runTimeoutSeconds,
  });
  
  // 7. 如果需要流式输出，设置父-子流中继
  if (params.streamTo === "parent") {
    await startAcpSpawnParentStreamRelay({
      childHandle: handle,
      parentSessionKey: params.parentSessionKey,
    });
  }
  
  // 8. 等待子 Agent 完成（或超时）
  const result = await handle.waitForCompletion();
  
  // 9. 可选：清理工作区
  if (params.cleanup === "delete") {
    await cleanupWorkspace(workspaceDir);
  }
  
  return result;
}
```

### 2.4 Stream Relay（父子 Agent 输出中继）

主 Agent 可以将子 Agent 的实时输出流式传给用户：

```typescript
// 子 Agent 产生输出 → 中继到父 Agent 的输出流 → 用户实时看到进展
export async function startAcpSpawnParentStreamRelay(params: {
  childHandle: AcpSpawnRuntimeCloseHandle;
  parentSessionKey: string;
}): Promise<void> {
  // 订阅子 Agent 的输出事件
  params.childHandle.onOutput(async (chunk) => {
    // 格式化为 [子Agent标签]: 内容
    const formatted = formatSubagentOutput(chunk, params.label);
    
    // 推送到父 Agent 的输出流
    await pushToParentStream(params.parentSessionKey, formatted);
  });
}
```

---

## 3. 文件附件（快照传递）

子 Agent 可以接收来自父 Agent 的文件：

```typescript
// 父 Agent 调用 spawn 时附带文件
await spawnTool.execute({
  task: "分析这份代码并写测试",
  attachments: [
    {
      name: "src/api.ts",
      content: readFileSync("src/api.ts", "utf8"),
      mimeType: "text/plain",
    }
  ],
});

// 子 Agent 在其工作区中看到 src/api.ts
// 注意：附件内容会被从对话历史中清洗（避免超大 payload 永久留存）
```

**安全注意**：附件内容通过 `sanitizeToolCallInputs` 从持久化的 transcript 中清除，避免超大 payload 填满存储。

---

## 4. 编排模式对比

| 模式 | 隔离级别 | 适用场景 | 延迟 |
|------|---------|---------|------|
| **Subagent** | 进程内 | 简单子任务，共享配置 | 低 |
| **ACP** | 独立进程 | 复杂任务，需要强隔离 | 中等 |
| **并行 ACP** | 独立进程组 | 可并发的独立子任务 | 最低（并行）|

---

## 5. 面试关键问答

**Q: 如何设计多 Agent 协作系统？需要考虑哪些工程问题？**

A: 六个关键工程问题：
1. **任务分解**：Orchestrator 如何将大任务拆解为可并行的子任务
2. **会话隔离**：每个子 Agent 有独立 session key，互不干扰
3. **结果汇聚**：等待所有子 Agent 完成后，Orchestrator 汇总结果
4. **流式可见性**：子 Agent 实时输出通过 stream relay 让用户看到进展
5. **超时控制**：每个子 Agent 设置超时，避免一个卡住拖慢整体
6. **层级防止嵌套爆炸**：检测 subagent 深度，超过阈值拒绝继续 spawn

**Q: 子 Agent 如何与父 Agent 共享文件/数据？**

A: 两种方式：①工作区继承（子 Agent 可以继承父 Agent 的 sandboxRoot，通过文件系统共享）；②附件快照（spawn 时父 Agent 将文件内容序列化附加到子 Agent 工作区，按值传递，不共享可变状态）。推荐用附件方式，因为这样子 Agent 的操作不会影响父 Agent 的工作区。

---

## 练习题

→ [exercises/ex09-multi-agent.ts](./exercises/ex09-multi-agent.ts)

→ 标准答案：[answers/ans09-multi-agent.ts](./answers/ans09-multi-agent.ts)
