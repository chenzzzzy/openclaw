# 知识点 4：工具调用（Function Calling）执行管线

## 1. 概念解释

### 什么是 Function Calling / Tool Use？

现代 LLM 可以在生成文本时调用外部工具：

```
User: "帮我查一下北京明天的天气"
  ↓
LLM: 调用 weather_tool({ city: "北京", date: "tomorrow" })
  ↓
Tool: 返回 { temp: "5~12°C", condition: "晴转多云" }
  ↓
LLM: "北京明天天气晴转多云，气温5~12°C，建议带件外套。"
```

这个能力让 Agent 从"聊天机器人"变成能真正执行任务的智能代理。

### Tool Use 的核心挑战

1. **Tool Schema 设计**：如何让 LLM 准确理解工具的参数和用途？
2. **类型安全**：如何验证 LLM 传来的参数是合法的？
优雅降级的核心：工具异常被捕获并转换为结构化的 JSON 错误结果，
LLM 收到后能理解失败原因、修正参数或切换策略，整个 Agent 流程不会因工具失败而中断。

3. **错误处理**：工具失败时如何优雅降级？
4. **权限控制**：哪些工具只有 owner 能用？
5. **并发安全**：工具调用能否并行执行？
6. **沙箱隔离**：代码执行工具如何防止危险操作？

---

## 2. OpenClaw 的工具系统架构

源码位置：`src/agents/tools/`, `src/agents/openclaw-tools.ts`

### 2.1 工具类型定义

```typescript
// src/agents/tools/common.ts

// 工具的核心类型
export type AnyAgentTool = AgentTool<any, unknown> & {
  ownerOnly?: boolean;  // 是否仅限 owner 使用
};

// 参数错误（400）
export class ToolInputError extends Error {
  readonly status: number = 400;
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

// 权限错误（403）
export class ToolAuthorizationError extends ToolInputError {
  override readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ToolAuthorizationError";
  }
}

export const OWNER_ONLY_TOOL_ERROR = "Tool restricted to owner senders.";
```

### 2.2 工具定义示例（以 Web Search 为例）

```typescript
// src/agents/tools/web-search.ts 模式

import { Type } from "@sinclair/typebox";

export function createWebSearchTool(options?: { apiKey?: string }): AnyAgentTool {
  return {
    name: "web_search",
    description: "Search the web for current information",
    
    // 使用 TypeBox 定义 JSON Schema（编译时类型安全 + 运行时验证）
    inputSchema: Type.Object({
      query: Type.String({
        description: "The search query",
        minLength: 1,
        maxLength: 500,
      }),
      maxResults: Type.Optional(Type.Integer({
        description: "Number of results to return",
        minimum: 1,
        maximum: 10,
        default: 5,
      })),
    }),
    
    // 执行函数
    async execute(input) {
      const query = readStringParam(input, "query", { required: true, trim: true });
      const maxResults = input.maxResults ?? 5;
      
      try {
        const results = await searchWeb(query, { limit: maxResults });
        return jsonResult({ results });
      } catch (err) {
        if (err instanceof RateLimitError) {
          throw new ToolInputError("Search rate limit exceeded, please try again later");
        }
        throw err;
      }
    },
  };
}
```

### 2.3 工具集中注册（createOpenClawTools）

```typescript
// src/agents/openclaw-tools.ts
export function createOpenClawTools(options?: OpenClawToolsOptions): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [];
  
  // 消息工具（跨渠道发送消息）
  if (!options?.disableMessageTool) {
    tools.push(createMessageTool({
      agentChannel: options?.agentChannel,
      agentTo: options?.agentTo,
      requireExplicitTarget: options?.requireExplicitMessageTarget,
    }));
  }
  
  // Web 工具
  tools.push(createWebFetchTool());
  tools.push(createWebSearchTool());
  
  // 代码执行工具（在沙箱中运行）
  tools.push(...createOpenClawCodingTools({
    sandboxRoot: options?.sandboxRoot,
    fsPolicy: options?.fsPolicy,  // 文件系统权限：none/readonly/readwrite
  }));
  
  // 记忆工具
  tools.push(createMemoryTool({
    agentDir: options?.agentDir,
    config: options?.config,
  }));
  
  // 子 Agent 工具（Owner Only）
  tools.push({
    ...createSessionsSpawnTool(options),
    ownerOnly: true,  // 只有 owner 才能 spawn 子 Agent
  });
  
  // 合并插件工具（用户安装的技能）
  const pluginTools = resolvePluginTools({
    allowlist: options?.pluginToolAllowlist,
  });
  tools.push(...pluginTools);
  
  return tools;
}
```

### 2.4 Action Gate 模式（细粒度权限控制）

```typescript
// 工具内部的动作级权限控制
export type ActionGate<T extends Record<string, boolean | undefined>> = (
  key: keyof T,
  defaultValue?: boolean,
) => boolean;

export function createActionGate<T extends Record<string, boolean | undefined>>(
  actions: T | undefined,
): ActionGate<T> {
  return (key, defaultValue = true) => {
    const value = actions?.[key];
    return value === undefined ? defaultValue : value;
  };
}

// 使用示例（在工具实现中）
const gate = createActionGate(config?.tools?.["sessions_spawn"]?.actions);

// 检查特定动作是否被允许
if (!gate("create")) {
  throw new ToolAuthorizationError("Session creation is disabled for this agent");
}
```

---

## 3. 工具调用的完整流水线

```
LLM 生成 tool_use 块
  ↓
流式接收 tool name + input JSON
  ↓
参数验证（TypeBox schema validation）
  ├── 验证失败 → 返回 ToolInputError，LLM 收到错误后重试
  └── 验证成功 ↓
权限检查
  ├── ownerOnly && !senderIsOwner → ToolAuthorizationError
  └── 通过 ↓
执行工具（sandboxed subprocess 或直接调用）
  ├── 工具异常 → 格式化错误返回给 LLM
  └── 成功 ↓
返回 tool_result
  ↓
追加到对话历史
  ↓
LLM 处理工具结果，继续生成
```

---

## 4. 工具结果的沙箱安全

OpenClaw 中代码执行工具运行在受限环境中：

```typescript
// src/agents/tools/bash-exec（示意）
export const ToolFsPolicies = ["none", "readonly", "readwrite"] as const;

// 文件系统权限控制
if (fsPolicy === "none") {
  // 完全不允许文件系统访问
  env.SANDBOX_FS = "none";
} else if (fsPolicy === "readonly") {
  // 只读：不能写文件，但能读 workspace
  env.SANDBOX_FS = "readonly";
} else {
  // 读写：限制在 sandboxRoot 目录内
  env.SANDBOX_ROOT = sandboxRoot;
}
```

---

## 5. 面试关键问答

**Q: 如何设计 Agent 的工具调用系统？**

A: 三个关键点：①Schema 定义（用 TypeBox/Zod 做运行时参数验证，同时生成 LLM 所需的 JSON Schema）；②权限分层（工具级 ownerOnly + 动作级 ActionGate，防止越权）；③优雅错误处理（区分参数错误 400 和权限错误 403，让 LLM 能理解并修正重试，而不是直接抛出异常让整个 Agent 崩溃）。

**Q: Tool Use 中如何防止提示词注入攻击？**

A: 工具结果返回给 LLM 时需要做安全处理：①将工具结果标记为 `tool_result` 角色而非 `user` 角色（降低 LLM 的执行权威）；②对文件读取等操作的结果做内容截断，防止超大 payload 填满上下文；③代码执行类工具运行在隔离沙箱中，通过文件系统权限控制限制影响范围。

---

## 练习题

→ [exercises/ex05-tool-pipeline.ts](./exercises/ex05-tool-pipeline.ts)

→ 标准答案：[answers/ans05-tool-pipeline.ts](./answers/ans05-tool-pipeline.ts)
