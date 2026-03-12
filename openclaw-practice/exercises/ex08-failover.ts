/**
 * 练习题 8：Auth Profile 故障转移
 *
 * 背景：
 * 生产 LLM 应用需要处理 API 速率限制、配额耗尽和服务故障。
 * Auth Profile 系统通过多 key 轮换和智能冷却机制保证服务高可用。
 *
 * 任务 1：实现 calculateCooldownMs（根据失败原因计算冷却时长）
 * 任务 2：实现 isProfileInCooldown（检查某个 profile 是否在冷却期）
 * 任务 3：实现 resolveProfileOrder（从多个 profile 中选出最优调用顺序）
 * 任务 4：实现 withAuthFailover（带故障转移的 LLM 调用包装器）
 */

// ============================================================
// 类型定义
// ============================================================

export type FailureReason =
  | "rate_limit"  // HTTP 429
  | "quota"       // 额度耗尽
  | "auth"        // HTTP 401/403，key 无效
  | "billing"     // 账单问题
  | "overload"    // 服务过载
  | "timeout"     // 请求超时
  | "unknown";    // 未知错误

export type CooldownRecord = {
  reason: FailureReason;
  until: number;  // Unix 时间戳（毫秒）
};

export type AuthProfile = {
  id: string;
  apiKey: string;
  cooldown?: CooldownRecord;
  lastGoodAt?: number;  // 最后一次成功的时间戳（毫秒）
  failureCount?: number;
};

export type FailoverResult<T> =
  | { success: true; data: T; profileId: string }
  | { success: false; error: string; allProfilesExhausted: true };

// ============================================================
// 练习 8.1：实现 calculateCooldownMs
// ============================================================

/**
 * 根据失败原因计算冷却时长（毫秒）
 *
 * 冷却策略（不同原因恢复时间不同）：
 * - rate_limit：60秒（1分钟后自动解除）
 * - quota：3600秒（1小时，需要人工关注或等待配额重置）
 * - auth：Infinity（永久，key 无效需要人工更换）
 * - billing：Infinity（永久，需要人工续费）
 * - overload：5秒（服务繁忙，短暂等待）
 * - timeout：10秒（超时，稍等重试）
 * - unknown：30秒（未知错误，保守等待）
 */
export function calculateCooldownMs(reason: FailureReason): number {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 8.2：实现 isProfileInCooldown
// ============================================================

/**
 * 检查某个 profile 是否当前处于冷却期（不可用）
 *
 * @param profile - auth profile
 * @param now - 当前时间戳（毫秒），默认 Date.now()
 * @returns true 如果仍在冷却期
 *
 * @example
 * isProfileInCooldown({
 *   id: "p1",
 *   apiKey: "sk-...",
 *   cooldown: { reason: "rate_limit", until: Date.now() + 60000 }
 * })
 * // → true（冷却期未到）
 *
 * isProfileInCooldown({
 *   id: "p1",
 *   apiKey: "sk-...",
 *   cooldown: { reason: "rate_limit", until: Date.now() - 1000 }
 * })
 * // → false（冷却已过期）
 */
export function isProfileInCooldown(profile: AuthProfile, now = Date.now()): boolean {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 8.3：实现 resolveProfileOrder
// ============================================================

/**
 * 从多个 profiles 中选出调用顺序
 *
 * 规则：
 * 1. 过滤掉冷却期内的 profiles
 * 2. 排序规则（优先级高→低）：
 *    a. preferredId 优先（如果指定且可用）
 *    b. 最近成功过的（lastGoodAt 越大越优先）
 *    c. 失败次数少的（failureCount 越小越优先）
 *    d. 其余顺序保持原样（稳定排序）
 *
 * @returns 排序后的 profile ID 列表（只包含不在冷却期的）
 */
export function resolveProfileOrder(params: {
  profiles: AuthProfile[];
  preferredId?: string;
  now?: number;
}): string[] {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 8.4：实现 withAuthFailover
// ============================================================

/**
 * 带故障转移的函数调用包装器
 *
 * 流程：
 * 1. 获取 profile 调用顺序
 * 2. 逐个尝试：
 *    a. 执行 fn(profile)
 *    b. 成功：标记 lastGoodAt，返回结果
 *    c. 失败：分类错误，设置冷却，决定是否继续尝试下一个
 * 3. 所有 profile 都失败：返回 allProfilesExhausted 错误
 *
 * 永久失败（auth/billing）：不继续尝试其他 profile，立即返回
 * 临时失败（rate_limit/overload/timeout）：继续尝试下一个 profile
 *
 * @param profiles - 可用的 auth profiles（会被修改：更新 cooldown 和 lastGoodAt）
 * @param fn - 使用 profile 进行的 LLM 调用
 * @param classifyError - 将错误分类为 FailureReason 的函数
 */
export async function withAuthFailover<T>(params: {
  profiles: AuthProfile[];
  preferredId?: string;
  fn: (profile: AuthProfile) => Promise<T>;
  classifyError: (error: unknown) => FailureReason;
}): Promise<FailoverResult<T>> {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

async function runTests() {
  console.log("=== 练习 8.1：calculateCooldownMs ===\n");

  console.assert(calculateCooldownMs("rate_limit") === 60_000, "❌ rate_limit 应为 60s");
  console.assert(calculateCooldownMs("quota") === 3_600_000, "❌ quota 应为 1h");
  console.assert(calculateCooldownMs("auth") === Infinity, "❌ auth 应为 Infinity");
  console.assert(calculateCooldownMs("billing") === Infinity, "❌ billing 应为 Infinity");
  console.assert(calculateCooldownMs("overload") === 5_000, "❌ overload 应为 5s");
  console.log("✅ calculateCooldownMs 所有断言通过");

  console.log("\n=== 练习 8.2：isProfileInCooldown ===\n");

  const now = Date.now();
  const p1: AuthProfile = { id: "p1", apiKey: "k1", cooldown: { reason: "rate_limit", until: now + 60_000 } };
  const p2: AuthProfile = { id: "p2", apiKey: "k2", cooldown: { reason: "rate_limit", until: now - 1_000 } };
  const p3: AuthProfile = { id: "p3", apiKey: "k3" };

  console.assert(isProfileInCooldown(p1, now) === true, "❌ 冷却中的 profile 应返回 true");
  console.assert(isProfileInCooldown(p2, now) === false, "❌ 冷却已过期应返回 false");
  console.assert(isProfileInCooldown(p3, now) === false, "❌ 没有冷却记录应返回 false");
  console.log("✅ isProfileInCooldown 所有断言通过");

  console.log("\n=== 练习 8.3：resolveProfileOrder ===\n");

  const profiles: AuthProfile[] = [
    { id: "p1", apiKey: "k1", lastGoodAt: now - 60_000, failureCount: 0 },
    { id: "p2", apiKey: "k2", lastGoodAt: now - 10_000, failureCount: 1 },   // 最近成功
    { id: "p3", apiKey: "k3", cooldown: { reason: "rate_limit", until: now + 30_000 } }, // 冷却中
    { id: "p4", apiKey: "k4", lastGoodAt: now - 5_000, failureCount: 0 },    // 最近且无失败
  ];

  // p3 在冷却期，应被过滤
  const order = resolveProfileOrder({ profiles, now });
  console.assert(!order.includes("p3"), "❌ 冷却中的 p3 不应出现在排序中");
  console.assert(order.length === 3, `❌ 应有 3 个可用 profile，得到 ${order.length}`);
  // p4 最近成功且无失败，应排第一
  console.assert(order[0] === "p4", `❌ p4 应排第一（最近成功），得到 ${order[0]}`);
  console.log(`✅ 排序结果: [${order.join(", ")}]`);

  // preferredId 测试
  const orderWithPref = resolveProfileOrder({ profiles, preferredId: "p1", now });
  console.assert(orderWithPref[0] === "p1", "❌ preferredId=p1 应排第一");
  console.log(`✅ preferredId 测试: [${orderWithPref.join(", ")}]`);

  console.log("\n=== 练习 8.4：withAuthFailover ===\n");

  const testProfiles: AuthProfile[] = [
    { id: "p1", apiKey: "k1-bad" },    // 第一个会 rate_limit
    { id: "p2", apiKey: "k2-good" },   // 第二个成功
  ];

  let callCount = 0;
  const result = await withAuthFailover({
    profiles: testProfiles,
    fn: async (profile) => {
      callCount++;
      if (profile.id === "p1") {
        throw new Error("HTTP 429: rate limit exceeded");
      }
      return `success with ${profile.id}`;
    },
    classifyError: (err) => {
      if (String(err).includes("429")) return "rate_limit";
      return "unknown";
    },
  });

  console.assert(result.success === true, "❌ 应该成功（通过 p2 故障转移）");
  if (result.success) {
    console.assert(result.profileId === "p2", `❌ 应该用 p2，得到 ${result.profileId}`);
    console.log(`✅ 故障转移成功: 尝试 ${callCount} 次，最终用 ${result.profileId}`);
  }

  // p1 应该在冷却期
  console.assert(
    testProfiles[0].cooldown !== undefined,
    "❌ p1 失败后应设置冷却期"
  );
  console.log(`✅ p1 冷却期: ${testProfiles[0].cooldown?.reason}`);

  // p2 应该更新 lastGoodAt
  console.assert(
    testProfiles[1].lastGoodAt !== undefined,
    "❌ p2 成功后应更新 lastGoodAt"
  );
  console.log(`✅ p2 lastGoodAt 已更新`);

  // 永久失败场景（auth 错误不继续尝试）
  const authProfiles: AuthProfile[] = [
    { id: "p1", apiKey: "k1" },
    { id: "p2", apiKey: "k2" },
  ];

  let authCallCount = 0;
  const authResult = await withAuthFailover({
    profiles: authProfiles,
    fn: async () => {
      authCallCount++;
      throw new Error("HTTP 401: invalid api key");
    },
    classifyError: (err) => {
      if (String(err).includes("401")) return "auth";
      return "unknown";
    },
  });

  // auth 错误是永久的，遇到第一个就应该停止
  console.assert(authResult.success === false, "❌ auth 错误应返回失败");
  console.assert(authCallCount === 1, `❌ auth 错误应只尝试 1 次，实际 ${authCallCount} 次`);
  console.log(`✅ auth 错误立即停止: 只尝试了 ${authCallCount} 次`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
