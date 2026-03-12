# 知识点 1：上下文窗口管理与 Token 预算

## 1. 概念解释

### 什么是上下文窗口（Context Window）？

LLM 每次调用只能处理有限数量的 token（词元）。这个限制叫做**上下文窗口**（Context Window）。

- GPT-4o：128K tokens
- Claude 3.5 Sonnet：200K tokens
- Llama 3.1 8B：128K tokens

一个 token ≈ 0.75 个英文单词 ≈ 1.5 个中文字符。

### 为什么这是 Agent 工程的核心问题？

Agent 在多轮对话中会积累：
1. **对话历史（Conversation History）**：每轮输入输出
2. **工具调用结果（Tool Results）**：可能包含大量数据
3. **系统提示（System Prompt）**：Agent 的指令和角色定义
4. **RAG 检索结果（Retrieved Context）**：从知识库召回的文档

如果不控制 token 总量，就会触发 API 报错（context length exceeded）或产生大量无效费用。

---

## 2. OpenClaw 的设计架构

### 2.1 多源优先级 Token 预算

OpenClaw 对 Context Window 大小的解析采用**多源优先级覆盖**策略：

```
优先级（高 → 低）：
1. agentContextTokens（管理员在 config 里强制限制）
2. modelsConfig（用户在 models.json 里自定义）
3. model（LLM 提供商的 API 返回值）
4. default（系统硬编码的默认值 200K）
```

**为什么这么设计？**
- 管理员需要控制成本，强制缩短窗口避免高费用
- 用户可能使用老版本模型（不支持长上下文）
- 提供商 API 返回的上下文窗口最准确
- 有默认值保证系统不会崩溃

### 2.2 Token 预算守卫（Context Window Guard）

源码位置：`src/agents/context-window-guard.ts`

```typescript
// 硬性最低限制：如果上下文窗口太小，直接拒绝请求
export const CONTEXT_WINDOW_HARD_MIN_TOKENS = 16_000;

// 警告阈值：剩余空间小于此值，发出警告
export const CONTEXT_WINDOW_WARN_BELOW_TOKENS = 32_000;

export function resolveContextWindowInfo(params: {
  cfg: OpenClawConfig | undefined;
  provider: string;
  modelId: string;
  modelContextWindow?: number;
  defaultTokens: number;
}): ContextWindowInfo {
  // 1. 从 models.json 配置查找（最高优先级）
  const fromModelsConfig = (() => {
    const match = models.find((m) => m?.id === params.modelId);
    return normalizePositiveInt(match?.contextWindow);
  })();
  
  // 2. 从模型 API 返回值
  const fromModel = normalizePositiveInt(params.modelContextWindow);
  
  // 3. 按优先级选择基准值
  const baseInfo = fromModelsConfig
    ? { tokens: fromModelsConfig, source: "modelsConfig" }
    : fromModel
      ? { tokens: fromModel, source: "model" }
      : { tokens: params.defaultTokens, source: "default" };
  
  // 4. 检查管理员配置的上限
  const capTokens = params.cfg?.agents?.defaults?.contextTokens;
  if (capTokens && capTokens < baseInfo.tokens) {
    return { tokens: capTokens, source: "agentContextTokens" }; // 管理员限制生效
  }
  return baseInfo;
}
```

### 2.3 守卫评估函数

```typescript
export function evaluateContextWindowGuard(params: {
  info: ContextWindowInfo;
  warnBelowTokens?: number;
  hardMinTokens?: number;
}): ContextWindowGuardResult {
  const hardMin = params.hardMinTokens ?? CONTEXT_WINDOW_HARD_MIN_TOKENS;
  const warnBelow = params.warnBelowTokens ?? CONTEXT_WINDOW_WARN_BELOW_TOKENS;
  
  return {
    ...params.info,
    shouldWarn: params.info.tokens < warnBelow,
    shouldBlock: params.info.tokens < hardMin,  // 直接拒绝
  };
}
```

---

## 3. Token 预算分配模型

在实际 Agent 调用中，Token 预算需要分配给多个部分：

```
Total Context Window
├── System Prompt          (固定消耗，通常 1K~5K)
├── Bootstrap Files        (workspace 文件，按需加载)
├── RAG Retrieved Context  (检索结果，可控制数量)
├── Conversation History   (滚动窗口，可截断)
├── Current User Message   (当前输入)
└── Output Budget          (预留给模型输出，通常 4K~8K)
```

**关键设计原则：**
- 输出 Token 必须提前预留（不能用完再说）
- History 部分是最灵活的，可以截断最老的轮次
- RAG 结果数量受 `maxResults` 控制

---

## 4. 为什么这么做（设计决策）

| 问题 | OpenClaw 的解决方案 | 原因 |
|------|-------------------|------|
| 不同模型上下文窗口不同 | 多源优先级覆盖 | 灵活兼容所有模型 |
| 窗口快满时怎么办 | shouldWarn + shouldBlock | 提前警告，避免突然崩溃 |
| 管理员要控制成本 | agentContextTokens 硬上限 | 防止超支 |
| Token 计数不准 | 20% 安全边距（compaction 里） | 估算不精确，需要缓冲 |

---

## 5. 面试关键问答

**Q: 如何设计 Agent 的 Token 预算管理？**

A: 分三层：①静态分配（系统提示 + Bootstrap 文件预留固定配额）；②动态限制（History 按轮次截断，RAG 按 maxResults 控制）；③运行时守卫（实际请求前检查总量，超出硬限制直接拒绝，接近软阈值发出告警）。优先级链保证管理员能全局限制成本。

**Q: Context Window 满了怎么处理？**

A: 两种策略：①截断历史（丢弃最老的轮次）；②压缩历史（用 LLM 把早期对话总结为摘要，见知识点 7）。OpenClaw 两种都用，先截断，截断后还超则压缩。

---

## 练习题

→ [exercises/ex01-context-window.ts](./exercises/ex01-context-window.ts)

→ 标准答案：[answers/ans01-context-window.ts](./answers/ans01-context-window.ts)
