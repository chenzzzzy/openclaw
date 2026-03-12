# 知识点 8：提示词缓存（Prompt Caching）策略

## 1. 概念解释

### 什么是 Prompt Caching？

LLM API 调用的费用主要由 **input tokens** 决定。如果每次请求都包含相同的系统提示、代码库文件、工具定义，这些"重复内容"会反复计费。

**Prompt Caching** 让 LLM 提供商（如 Anthropic）在服务器端缓存某些固定内容，后续请求命中缓存后费用大幅降低（Anthropic 缓存读取价格约为正常价格的 10%）。

### 哪些内容适合缓存？

```
系统提示（System Prompt）         → 每次对话都相同，非常适合
Bootstrap 文件（代码库快照）       → 会话期间固定，适合
工具定义（Tool Schemas）          → 会话期间固定，适合
对话历史（前 N 轮）               → 频繁变化，不适合（会使缓存失效）
```

---

## 2. OpenClaw 的多层缓存架构

### 2.1 Bootstrap 文件缓存（内存级）

源码位置：`src/agents/bootstrap-cache.ts`

```typescript
// 内存中的全局缓存：sessionKey → WorkspaceBootstrapFile[]
const cache = new Map<string, WorkspaceBootstrapFile[]>();

/**
 * 懒加载 + 缓存：首次加载后存入内存，后续直接返回
 * 避免每次 Agent 调用都重新读取磁盘文件
 */
export async function getOrLoadBootstrapFiles(params: {
  workspaceDir: string;
  sessionKey: string;
}): Promise<WorkspaceBootstrapFile[]> {
  // 缓存命中：直接返回
  const existing = cache.get(params.sessionKey);
  if (existing) return existing;
  
  // 缓存未命中：从磁盘加载
  const files = await loadWorkspaceBootstrapFiles(params.workspaceDir);
  cache.set(params.sessionKey, files);
  return files;
}

/**
 * 会话重置（/reset 或 /new 命令）时清除缓存
 * 这样新会话会重新读取最新的 workspace 文件
 */
export function clearBootstrapSnapshot(sessionKey: string): void {
  cache.delete(sessionKey);
}

export function clearBootstrapSnapshotOnSessionRollover(params: {
  sessionKey?: string;
  previousSessionId?: string;
}): void {
  // 只有真正发生 session rollover（new/reset）时才清除
  if (!params.sessionKey || !params.previousSessionId) return;
  clearBootstrapSnapshot(params.sessionKey);
}
```

**缓存失效策略：**
- **主动失效**：用户执行 `/reset` 或 `/new` 命令时
- **Session Rollover**：Session ID 改变时（新开对话）
- **服务重启**：内存缓存不持久化，重启后重新加载

### 2.2 LLM 层的 Prompt Cache（Provider 级）

OpenClaw 利用 Anthropic 的原生 prompt caching 功能：

```typescript
// 对 Anthropic 请求标记缓存点
// 在 system prompt 末尾加 cache_control: {"type": "ephemeral"}
// 告诉 Anthropic：这里的内容请缓存

const systemPrompt = [
  {
    type: "text",
    text: buildSystemPrompt(agent),
    cache_control: { type: "ephemeral" }  // 标记缓存点
  }
];

// Bootstrap 文件也标记为可缓存
const bootstrapMessages = bootstrapFiles.map(file => ({
  type: "text",
  text: file.content,
  cache_control: { type: "ephemeral" }
}));
```

**cache_control 的工作原理：**
- Anthropic 在第一次看到此内容时将其存储到服务器缓存
- 后续请求如果前缀完全匹配，则命中缓存
- 缓存有效期 5 分钟（ephemeral）或更长（按 Anthropic 文档）
- 缓存读取价格约为写入的 10%，比正常 input token 便宜 90%

### 2.3 Cache Trace 诊断系统

源码位置：`src/agents/cache-trace.ts`

```typescript
// 追踪每个阶段的缓存状态，用于调试和优化
export type CacheTraceStage =
  | "session:loaded"     // Session 加载完成
  | "session:sanitized"  // 安全清洗后
  | "session:limited"    // 历史截断后
  | "prompt:before"      // 构建 prompt 前
  | "prompt:images"      // 图片处理后
  | "stream:context"     // LLM 流式调用时
  | "session:after";     // 对话完成后

export type CacheTraceEntry = {
  stage: CacheTraceStage;
  tokens: number;
  cacheReadTokens?: number;    // 命中缓存读取的 tokens
  cacheWriteTokens?: number;   // 写入缓存的 tokens
  fingerprint?: string;        // 内容哈希，用于对比是否相同
};
```

**诊断用途：**
- 确认缓存是否真的命中（通过 cacheReadTokens > 0）
- 分析哪些阶段的 token 最多（优化重点）
- 对比不同请求的 fingerprint（排查缓存失效原因）

---

## 3. 嵌入式缓存（Embedding Cache）

源码位置：`src/memory/manager.ts`（`EMBEDDING_CACHE_TABLE`）

```typescript
// SQLite 中的嵌入缓存表
const EMBEDDING_CACHE_TABLE = "embedding_cache";

// 结构：content_hash → embedding_vector
// 避免对相同文本重复调用嵌入 API

// 实际流程：
async function getOrComputeEmbedding(text: string): Promise<number[]> {
  const hash = sha256(text);
  
  // 检查缓存
  const cached = db.prepare(
    `SELECT embedding FROM ${EMBEDDING_CACHE_TABLE} WHERE hash = ?`
  ).get(hash);
  
  if (cached) return JSON.parse(cached.embedding);  // 缓存命中
  
  // 调用 API
  const embedding = await embeddingProvider.embed(text);
  
  // 写入缓存
  db.prepare(
    `INSERT OR REPLACE INTO ${EMBEDDING_CACHE_TABLE} (hash, embedding) VALUES (?, ?)`
  ).run(hash, JSON.stringify(embedding));
  
  return embedding;
}
```

---

## 4. 批量嵌入（Batch Embeddings）

对于需要一次性索引大量文档，OpenClaw 使用异步批处理：

```typescript
// src/memory/batch-openai.ts（示意）

// 上传一批文本到 OpenAI Batch API
const batchJob = await openai.batches.create({
  input_file_id: await uploadBatchFile(texts),
  endpoint: "/v1/embeddings",
  completion_window: "24h",  // 最长等待 24 小时
});

// 轮询等待完成（有超时控制）
while (true) {
  const status = await openai.batches.retrieve(batchJob.id);
  if (status.status === "completed") break;
  if (status.status === "failed") throw new BatchError(status.errors);
  await sleep(pollIntervalMs);  // 避免过频轮询
}

// 下载并解析结果
const results = await downloadBatchResults(status.output_file_id);
```

**为什么用 Batch API？** 
- 批量调用比单条调用便宜约 50%
- 适合非实时场景（索引不需要毫秒级响应）

---

## 5. 缓存策略总结

| 缓存层 | 位置 | 内容 | 失效策略 |
|--------|------|------|---------|
| Bootstrap 文件缓存 | 进程内存 | workspace 文件列表 | session reset / 重启 |
| LLM Prompt 缓存 | Anthropic 服务器 | system prompt + 文件 | 5 分钟 TTL / 前缀改变 |
| 嵌入缓存 | SQLite | text → embedding | 永不失效（内容哈希） |
| 模型注册表缓存 | 进程内存 | context window 大小 | 进程生命周期 |

---

## 6. 面试关键问答

**Q: 如何降低 LLM API 的调用成本？**

A: 三个维度：①输入 token 复用（利用 Anthropic 等提供的 prompt caching，系统提示和 workspace 文件标记为可缓存，命中缓存后价格降 90%）；②避免重复嵌入（文本内容哈希为 key，存 SQLite，相同文本不重复调用 embedding API）；③批量 API（非实时嵌入需求用 Batch API，价格约便宜 50%）。

**Q: Bootstrap 文件缓存在什么时候失效？**

A: 主动失效：用户执行 /reset 或 /new 命令时清除该 session 的缓存，确保新对话读取最新的 workspace 文件。被动失效：服务重启后所有内存缓存清空。设计原则：缓存的生命周期和 session 的生命周期对齐，而不是永久缓存（否则 workspace 文件更新后 Agent 看不到新内容）。
