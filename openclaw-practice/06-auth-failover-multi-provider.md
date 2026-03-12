# 知识点 6：Auth Profile 故障转移与多 Provider 支持

## 1. 概念解释

### 为什么需要 Auth Profile 管理？

生产 Agent 面临的挑战：
- API Key 有**速率限制（Rate Limit）**：超出后需要等待或切换
- API Key 有**额度限制（Quota）**：用完需要切换到备用 key
- **服务不稳定**：某个 provider 宕机，需要切换到备用 provider
- **多用户/多账号**：需要轮询使用多个 key 均衡负载
- **Billing 问题**：账单未付导致 key 失效，需要优雅降级

### 核心需求

1. **自动故障转移**：检测到失败后，自动切换到下一个可用的 auth profile
2. **冷却管理**：被限速的 key 在冷却期内不再使用
3. **最优选择**：从多个可用 key 中选出当前最佳的一个
4. **透明恢复**：问题解决后自动恢复使用原来的 key

---

## 2. OpenClaw 的 Auth Profile 系统

源码位置：`src/agents/auth-profiles/`

### 2.1 Profile 数据结构

```typescript
// src/agents/auth-profiles/types.ts

export type AuthProfileStore = {
  profiles: Record<string, AuthProfile>;
  updatedAt?: string;
};

export type AuthProfile = {
  id: string;
  provider: string;
  credential: AuthProfileCredential;
  usageStats?: ProfileUsageStats;
  cooldowns?: CooldownRecord[];
};

export type ProfileUsageStats = {
  lastUsedAt?: string;
  lastGoodAt?: string;    // 最后一次成功的时间
  failureCount?: number;  // 连续失败次数
  totalRequests?: number;
};

// 冷却期记录（被限速后不可用的时间窗口）
export type CooldownRecord = {
  reason: AuthProfileFailureReason;
  until: string;          // ISO 时间戳
  at?: string;           // 开始冷却的时间
};
```

### 2.2 失败分类与冷却时长

```typescript
// 不同失败原因对应不同冷却时长
export type AuthProfileFailureReason =
  | "rate_limit"     // 速率限制（通常 1 分钟后重试）
  | "quota"          // 额度耗尽（较长冷却，可能需要人工干预）
  | "auth"           // 认证失败（key 无效或过期）
  | "billing"        // 账单问题
  | "overload"       // 服务过载
  | "timeout"        // 请求超时
  | "unknown";       // 未知错误

export function calculateAuthProfileCooldownMs(
  reason: AuthProfileFailureReason,
): number {
  switch (reason) {
    case "rate_limit": return 60_000;      // 1 分钟
    case "quota":      return 3600_000;    // 1 小时
    case "auth":       return Infinity;    // 永久冷却（需人工修复）
    case "billing":    return Infinity;    // 永久冷却
    case "overload":   return 5_000;       // 5 秒
    case "timeout":    return 10_000;      // 10 秒
    default:           return 30_000;      // 30 秒
  }
}
```

### 2.3 Profile 排序算法（最优选择）

```typescript
// src/agents/auth-profiles/order.ts
export function resolveAuthProfileOrder(params: {
  store: AuthProfileStore;
  provider: string;
  preferredProfileId?: string;
}): string[] {
  const profiles = listProfilesForProvider(params.store, params.provider);
  
  // 过滤掉当前在冷却期的 profiles
  const available = profiles.filter(p => !isProfileInCooldown(p));
  
  // 排序规则：
  // 1. 优先使用指定的 preferredProfileId
  // 2. 其次使用 lastGoodAt 最近的（最近成功过的）
  // 3. 最后轮询（避免单一 key 过度使用）
  return available
    .sort((a, b) => {
      // 优先指定的
      if (a.id === params.preferredProfileId) return -1;
      if (b.id === params.preferredProfileId) return 1;
      
      // 按最后成功时间排序
      const aLastGood = a.usageStats?.lastGoodAt ?? "0";
      const bLastGood = b.usageStats?.lastGoodAt ?? "0";
      return bLastGood.localeCompare(aLastGood);  // 最近成功的优先
    })
    .map(p => p.id);
}
```

### 2.4 故障转移执行流程

```typescript
// src/agents/pi-embedded-runner/run.ts（简化）
async function runWithFailover(params: RunParams) {
  const profileOrder = resolveAuthProfileOrder({
    store: authStore,
    provider: params.provider,
  });
  
  let lastError: Error | undefined;
  
  for (const profileId of profileOrder) {
    // 检查是否在冷却期
    if (isProfileInCooldown(authStore.profiles[profileId])) {
      continue;
    }
    
    try {
      // 标记为"使用中"
      await markAuthProfileUsed(authStore, profileId);
      
      // 执行 LLM 调用
      const result = await callLLM({ ...params, profileId });
      
      // 成功！标记为"良好"
      await markAuthProfileGood(authStore, profileId);
      return result;
      
    } catch (err) {
      const reason = classifyFailoverReason(err);
      
      // 记录失败，开始冷却
      await markAuthProfileFailure(authStore, profileId, reason);
      
      lastError = err;
      
      // 如果是认证/账单问题，不要重试其他 profile（问题不同）
      if (reason === "auth" || reason === "billing") {
        throw new FailoverError(`Auth profile ${profileId} failed: ${reason}`);
      }
      
      // 继续尝试下一个 profile
      continue;
    }
  }
  
  throw new FailoverError(
    `All auth profiles exhausted. Last error: ${lastError?.message}`
  );
}
```

---

## 3. 多 Provider 级联故障转移

除了同一 provider 的多个 key，OpenClaw 还支持跨 provider 的故障转移：

```yaml
# 配置示例
agents:
  defaults:
    provider: anthropic
    model: claude-3-5-sonnet
    fallbacks:
      - provider: openai
        model: gpt-4o
      - provider: ollama
        model: llama3.1:8b  # 本地模型作为最终兜底
```

**降级策略：**
1. 主 provider 失败 → 切换到第一个 fallback
2. 性能退化（如切换到 Ollama）→ 用户可能感知到响应变慢
3. 日志记录：哪个 provider 在用，为什么降级，便于排查

---

## 4. 指数退避（Exponential Backoff）

对于过载（overload）场景，OpenClaw 使用带 jitter 的指数退避：

```typescript
// src/infra/backoff.ts
const OVERLOAD_FAILOVER_BACKOFF_POLICY: BackoffPolicy = {
  initialMs: 250,
  maxMs: 1_500,
  factor: 2,
  jitter: 0.2,   // ±20% 随机抖动，防止多个请求同时重试
};

export function computeBackoff(attempt: number, policy: BackoffPolicy): number {
  const base = Math.min(
    policy.initialMs * Math.pow(policy.factor, attempt),
    policy.maxMs
  );
  const jitterRange = base * policy.jitter;
  return base + (Math.random() * 2 - 1) * jitterRange;
}
```

---

## 5. 面试关键问答

**Q: 如何设计 LLM API 的高可用机制？**

A: 四层防护：①Auth Profile 冷却机制（检测到限速/超额后将该 key 标记为不可用，冷却时长按失败原因分级，rate_limit 1 分钟，quota 耗尽 1 小时，auth 错误永久下线待人工修复）；②同 provider 多 key 轮询（按最近成功时间排序，选择最可能成功的 key）；③跨 provider 降级（主 provider 完全不可用时切换到备用 provider）；④指数退避重试（过载时带 jitter 避免雪崩）。

**Q: 如何判断 API 失败是"暂时的"还是"永久的"？**

A: 通过 HTTP 状态码 + 响应体分类：429 = rate limit（暂时）、402 = billing（需人工）、401/403 = auth error（需修复）、503 = overload（短暂重试）。OpenClaw 的 `classifyFailoverReason` 函数封装了这些规则，将原始错误映射到标准化的失败原因，再根据原因决定冷却时长和是否继续尝试其他 profile。

---

## 练习题

→ [exercises/ex08-failover.ts](./exercises/ex08-failover.ts)

→ 标准答案：[answers/ans08-failover.ts](./answers/ans08-failover.ts)
