# 知识点 2：对话历史截断策略

## 1. 概念解释

### 为什么需要截断历史？

Agent 是有状态的服务。每次调用时，需要把完整的对话历史传给 LLM，这样模型才知道"之前聊了什么"。

但随着对话轮次增加，历史越来越长：
- **费用线性增长**：每轮的 input tokens 包含所有历史
- **上下文窗口有限**：达到上限则 API 报错
- **信噪比下降**：太久远的上下文反而干扰模型判断

### 截断 vs 压缩

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **截断（Truncation）** | 简单、无 LLM 调用开销 | 直接丢失信息 | 短期对话、信息价值递减场景 |
| **压缩（Compaction）** | 保留关键信息 | 需额外 LLM 调用 | 长期任务、信息密集场景 |

OpenClaw 两者结合：先截断，截断后仍超限则压缩（见知识点 7）。

---

## 2. OpenClaw 的历史截断实现

源码位置：`src/agents/pi-embedded-runner/history.ts`

### 2.1 核心截断算法

```typescript
/**
 * 限制对话历史为最后 N 个用户轮次（及其对应的 AI 响应）
 * 保证语义完整性：不会截断到一半的轮次中间
 */
export function limitHistoryTurns(
  messages: AgentMessage[],
  limit: number | undefined,
): AgentMessage[] {
  if (!limit || limit <= 0 || messages.length === 0) {
    return messages;  // 不限制
  }

  let userCount = 0;
  let lastUserIndex = messages.length;

  // 从后往前扫描，计数用户消息
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userCount++;
      if (userCount > limit) {
        // 找到第 limit+1 个用户消息，从它之后的位置截取
        return messages.slice(lastUserIndex);
      }
      lastUserIndex = i;
    }
  }
  return messages;  // 消息数量未超限
}
```

**关键设计要点：**
1. **以"轮次"而非"消息数"为单位** → 保证截断后对话语义完整（不会出现 user 消息没有 assistant 响应的情况）
2. **从后往前扫描** → O(n) 时间复杂度，精确找到截断点
3. **保留最新的 N 轮** → 最近的对话往往最相关

### 2.2 按渠道/用户的差异化限制

不同场景需要不同的历史深度：

```typescript
export function getHistoryLimitFromSessionKey(
  sessionKey: string | undefined,
  config: OpenClawConfig | undefined,
): number | undefined {
  // 解析 sessionKey 格式：agent:main:telegram:dm:12345678
  const parts = sessionKey.split(":").filter(Boolean);
  const provider = providerParts[0]?.toLowerCase();  // "telegram"
  const kind = providerParts[1]?.toLowerCase();       // "dm" or "group"
  const userId = providerParts.slice(2).join(":");    // "12345678"

  const resolveProviderConfig = (cfg, providerId) => {
    return cfg?.channels?.[providerId];
  };

  const providerCfg = resolveProviderConfig(config, provider);

  // 优先级：个人DM配置 > DM默认 > 频道默认
  if (kind === "dm" && userId) {
    const dmOverride = providerCfg?.dms?.[userId]?.historyLimit;
    if (dmOverride != null) return dmOverride;       // 针对特定用户的限制
  }
  
  if (kind === "dm") {
    return providerCfg?.dmHistoryLimit;              // DM 类型的全局限制
  }
  
  return providerCfg?.historyLimit;                  // 群组/频道的限制
}
```

**为什么需要差异化？**
- DM（私聊）：用户期望 Agent 记住更长历史（更有状态感）
- 群组：历史中混杂其他人的消息，限制反而更准确
- 特定用户：可以给 VIP 用户更长的记忆窗口

### 2.3 线程 Session Key 处理

```typescript
// 线程 session key 带后缀: "agent:main:slack:dm:U123:thread:1234567890"
// 对比历史限制时，需要剥离线程后缀
const THREAD_SUFFIX_REGEX = /^(.*)(?::(?:thread|topic):\d+)$/i;

function stripThreadSuffix(value: string): string {
  const match = value.match(THREAD_SUFFIX_REGEX);
  return match?.[1] ?? value;  // 返回无线程后缀的 key
}
```

**为什么？** 同一用户在不同线程中聊天，应该共享历史限制配置，而不是因为线程后缀不同而找不到配置。

---

## 3. Session Key 设计

Session Key 是对话历史的存储键，格式设计非常精妙：

```
agent:{agentId}:{channel}:{kind}:{peerId}[:{thread}:{threadId}]

示例:
  agent:main:telegram:dm:123456789
  agent:main:discord:group:987654321
  agent:coder:slack:dm:U12345678:thread:1234567890.123456
```

| 字段 | 含义 | 示例 |
|------|------|------|
| `agent:main` | Agent 类型 | main, coder, researcher |
| `telegram` | 消息渠道 | telegram, discord, slack |
| `dm/group` | 会话类型 | dm（私聊）, group（群组） |
| `123456789` | 用户/群组 ID | 平台分配的唯一 ID |
| `thread:...` | 线程 ID（可选） | Slack thread_ts |

**好处：** 
- 天然支持多租户（不同渠道、不同用户完全隔离）
- 从 key 就能解析出所有路由信息
- 支持线程级别的独立会话

---

## 4. 完整 History 管理流水线

```
加载 Session → limitHistoryTurns → sanitize → compaction(if needed) → LLM 调用
     ↑                                                      ↓
持久化存储                                         新消息追加到历史
```

---

## 5. 面试关键问答

**Q: 多轮对话中如何控制 token 消耗？**

A: 三层策略：①滑动窗口截断（保留最近 N 轮用户消息，以轮次而非消息数为单位保证语义完整）；②按用户/渠道差异化配置（DM 允许更长历史，群组更短）；③极限情况下用 LLM 压缩（把早期历史摘要化，保留关键信息）。

**Q: 为什么以"用户轮次"而非"消息总数"截断？**

A: 一个用户轮次对应一对 user+assistant 消息。如果按消息数截断，可能截到 user 消息有但 assistant 响应没有，或者 tool_use 和 tool_result 对不上，会导致 API 格式错误。以轮次为单位保证了消息结构的语义完整性。

---

## 练习题

→ [exercises/ex02-history-truncation.ts](./exercises/ex02-history-truncation.ts)

→ 标准答案：[answers/ans02-history-truncation.ts](./answers/ans02-history-truncation.ts)
