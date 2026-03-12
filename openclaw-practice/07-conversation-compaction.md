# 知识点 7：对话压缩（Context Compaction）

## 1. 概念解释

### 什么是对话压缩？

当对话历史过长，超过上下文窗口限制时，有两种处理方式：
1. **截断（Truncation）**：直接丢弃最早的消息（简单但会丢失信息）
2. **压缩（Compaction）**：用 LLM 将早期对话**摘要化**，用摘要替代原始消息

**核心思想：** 用少量 token 的摘要保存大量 token 的关键信息。

### 什么时候需要压缩？

```
例：Agent 在帮用户写一个复杂程序，已经对话了 100 轮
├── 前 60 轮：讨论需求、架构设计、初步实现
├── 后 40 轮：修 bug、优化性能（当前进行时）
└── 总 token：180K（超过 128K 限制）

截断策略：丢弃前 60 轮 → Agent 忘记了需求和架构决策！
压缩策略：把前 60 轮摘要为 2K token → Agent 保留关键信息继续工作
```

---

## 2. OpenClaw 的压缩实现

源码位置：`src/agents/compaction.ts`

### 2.1 压缩触发条件

```typescript
// 关键常数
export const BASE_CHUNK_RATIO = 0.4;   // 每次压缩处理 40% 的历史
export const MIN_CHUNK_RATIO = 0.15;   // 最少压缩 15%
export const SAFETY_MARGIN = 1.2;      // 20% 安全边距（token 估算不精确）

// 触发条件：当历史 token 数超过上下文窗口的某个比例时
// 在 run.ts 中调用：
if (estimatedTokens > contextWindow * 0.8) {
  await compactHistory(session, contextWindow);
}
```

### 2.2 消息分割算法

```typescript
/**
 * 将消息列表按 token 份额均匀分割为 parts 份
 * 用于大型历史的分块压缩（避免单次摘要 prompt 本身超限）
 */
export function splitMessagesByTokenShare(
  messages: AgentMessage[],
  parts = 2,
): AgentMessage[][] {
  if (messages.length === 0) return [];
  
  const normalizedParts = Math.min(Math.max(1, Math.floor(parts)), messages.length);
  if (normalizedParts <= 1) return [messages];
  
  const targetTokensPerPart = estimateMessagesTokens(messages) / normalizedParts;
  
  const result: AgentMessage[][] = [];
  let currentChunk: AgentMessage[] = [];
  let currentTokens = 0;
  
  for (const message of messages) {
    const msgTokens = estimateCompactionMessageTokens(message);
    
    if (currentTokens + msgTokens > targetTokensPerPart * 1.1 && currentChunk.length > 0) {
      result.push(currentChunk);
      currentChunk = [message];
      currentTokens = msgTokens;
    } else {
      currentChunk.push(message);
      currentTokens += msgTokens;
    }
  }
  
  if (currentChunk.length > 0) result.push(currentChunk);
  return result;
}
```

### 2.3 摘要指令构建

**关键问题：** 摘要时 LLM 不能随意改写，需要保留关键信息。

```typescript
// 必须保留的信息类型（硬编码指令）
const MERGE_SUMMARIES_INSTRUCTIONS = [
  "Merge these partial summaries into a single cohesive summary.",
  "",
  "MUST PRESERVE:",
  "- Active tasks and their current status (in-progress, blocked, pending)",
  "- Batch operation progress (e.g., '5/17 items completed')",  // 任务进度不能丢！
  "- The last thing the user requested and what was being done about it",
  "- Decisions made and their rationale",
  "- TODOs, open questions, and constraints",
  "- Any commitments or follow-ups promised",
  "",
  "PRIORITIZE recent context over older history.",
].join("\n");

// 不透明标识符保护（关键！）
const IDENTIFIER_PRESERVATION_INSTRUCTIONS =
  "Preserve all opaque identifiers exactly as written (no shortening or reconstruction), " +
  "including UUIDs, hashes, IDs, tokens, API keys, hostnames, IPs, ports, URLs, and file names.";
```

**为什么要保护不透明标识符？**
如果 LLM 在摘要中把 `session_id: "abc-123-xyz-789"` 改成了 `session_id: "abc..."`,
后续操作就会因为 ID 不完整而失败。这是 LLM 摘要中很容易犯的错误。

### 2.4 分级压缩策略

```typescript
export async function compactHistory(params: {
  messages: AgentMessage[];
  contextWindow: number;
  llmClient: LLMClient;
  instructions?: CompactionSummarizationInstructions;
}): Promise<AgentMessage[]> {
  const totalTokens = estimateMessagesTokens(params.messages);
  
  // 计算需要压缩的消息数量
  const chunkRatio = Math.max(
    MIN_CHUNK_RATIO,
    Math.min(BASE_CHUNK_RATIO, 1 - params.contextWindow / totalTokens)
  );
  const compactCount = Math.floor(params.messages.length * chunkRatio);
  
  const toCompact = params.messages.slice(0, compactCount);  // 前 N 条
  const toKeep = params.messages.slice(compactCount);         // 后面的保留
  
  // 如果要压缩的内容太大，先分块
  const chunks = splitMessagesByTokenShare(toCompact, 2);
  
  // 对每块生成摘要
  const summaries = await Promise.all(
    chunks.map(chunk => generateSummary(chunk, {
      instructions: buildCompactionSummarizationInstructions(
        undefined,
        params.instructions,
      ),
    }))
  );
  
  // 如果有多个摘要块，合并为一个
  let finalSummary: string;
  if (summaries.length === 1) {
    finalSummary = summaries[0];
  } else {
    finalSummary = await mergeSummaries(summaries, {
      instructions: MERGE_SUMMARIES_INSTRUCTIONS,
    });
  }
  
  // 构造摘要消息
  const summaryMessage: AgentMessage = {
    role: "user",
    content: `[Conversation Summary]\n${finalSummary}`,
  };
  
  return [summaryMessage, ...toKeep];
}
```

---

## 3. Token 估算与安全边距

```typescript
/**
 * 估算消息 token 数（注意：只是估算，不精确）
 * SECURITY: 剥离 toolResult.details（可能包含不可信内容）
 */
export function estimateMessagesTokens(messages: AgentMessage[]): number {
  const safe = stripToolResultDetails(messages);  // 安全清洗
  return safe.reduce((sum, msg) => sum + estimateTokens(msg), 0);
}

// 为什么需要 20% 安全边距？
// estimateTokens 使用字符数估算，不同语言/token 化规则差异很大
// 中文每个字约 1.5~2 个 token，但估算可能按 1 个算
// 20% 边距保证不会因为估算误差导致实际超限
```

---

## 4. 压缩 vs 截断对比

| 维度 | 截断 | 压缩 |
|------|------|------|
| 实现复杂度 | 简单 | 复杂（需要额外 LLM 调用） |
| 额外成本 | 无 | 有（额外的摘要请求） |
| 信息保留 | 差（直接丢失） | 好（摘要保留关键信息） |
| 适用场景 | 闲聊、信息价值低 | 任务型对话、信息密集 |
| 延迟影响 | 无 | 增加延迟（摘要 LLM 调用） |

**OpenClaw 策略：** 先截断（`limitHistoryTurns`），截断后仍超限则压缩。

---

## 5. 面试关键问答

**Q: Agent 处理超长对话时如何保证关键信息不丢失？**

A: 分层处理：①先尝试轮次截断（最近 N 轮），保留最新上下文；②截断后仍超限则触发压缩，用 LLM 把早期历史摘要化；③压缩时有硬性指令保护关键信息（任务进度、决策依据、所有不透明标识符如 UUID/hash/API key 必须逐字保留）；④20% 安全边距应对 token 估算误差；⑤大块历史先分块摘要再合并，避免单次摘要本身超限。

**Q: 为什么压缩时要特别保护 UUID 和哈希值？**

A: LLM 有"缩写"倾向，可能把 `tx-id: "abc123def456"` 摘要为 `tx-id: "abc..."` 或完全省略。而后续操作（数据库查询、API 调用）需要精确 ID，一旦被改写则所有依赖该 ID 的操作全部失败。这是 LLM 压缩中最危险的静默错误之一。

---

## 练习题

→ [exercises/ex07-compaction.ts](./exercises/ex07-compaction.ts)

→ 标准答案：[answers/ans07-compaction.ts](./answers/ans07-compaction.ts)
