/**
 * 标准答案 8：Auth Profile 故障转移
 */

export type FailureReason =
  | "rate_limit" | "quota" | "auth" | "billing"
  | "overload" | "timeout" | "unknown";

export type CooldownRecord = { reason: FailureReason; until: number };
export type AuthProfile = {
  id: string; apiKey: string;
  cooldown?: CooldownRecord;
  lastGoodAt?: number; failureCount?: number;
};
export type FailoverResult<T> =
  | { success: true; data: T; profileId: string }
  | { success: false; error: string; allProfilesExhausted: true };

/**
 * 根据失败原因计算冷却时长
 */
export function calculateCooldownMs(reason: FailureReason): number {
  switch (reason) {
    case "rate_limit": return 60_000;       // 1 分钟
    case "quota":      return 3_600_000;    // 1 小时
    case "auth":       return Infinity;     // 永久（key 无效）
    case "billing":    return Infinity;     // 永久（需人工干预）
    case "overload":   return 5_000;        // 5 秒
    case "timeout":    return 10_000;       // 10 秒
    default:           return 30_000;       // 30 秒
  }
}

/**
 * 检查 profile 是否在冷却期
 */
export function isProfileInCooldown(profile: AuthProfile, now = Date.now()): boolean {
  if (!profile.cooldown) return false;
  return profile.cooldown.until > now;
}

/**
 * 选出最优 profile 调用顺序
 *
 * 过滤冷却中的，然后按：preferredId > lastGoodAt > failureCount 排序
 */
export function resolveProfileOrder(params: {
  profiles: AuthProfile[];
  preferredId?: string;
  now?: number;
}): string[] {
  const now = params.now ?? Date.now();

  // 过滤掉冷却期内的 profiles
  const available = params.profiles.filter(p => !isProfileInCooldown(p, now));

  // 排序
  const sorted = [...available].sort((a, b) => {
    // preferredId 优先
    if (a.id === params.preferredId) return -1;
    if (b.id === params.preferredId) return 1;

    // 按 lastGoodAt 降序（最近成功的优先）
    const aLast = a.lastGoodAt ?? 0;
    const bLast = b.lastGoodAt ?? 0;
    if (bLast !== aLast) return bLast - aLast;

    // 按 failureCount 升序（失败少的优先）
    const aFail = a.failureCount ?? 0;
    const bFail = b.failureCount ?? 0;
    return aFail - bFail;
  });

  return sorted.map(p => p.id);
}

/**
 * 带故障转移的 LLM 调用包装器
 */
export async function withAuthFailover<T>(params: {
  profiles: AuthProfile[];
  preferredId?: string;
  fn: (profile: AuthProfile) => Promise<T>;
  classifyError: (error: unknown) => FailureReason;
}): Promise<FailoverResult<T>> {
  const profileOrder = resolveProfileOrder({
    profiles: params.profiles,
    preferredId: params.preferredId,
  });

  let lastError: string = "No profiles available";

  for (const profileId of profileOrder) {
    const profile = params.profiles.find(p => p.id === profileId);
    if (!profile) continue;

    try {
      const data = await params.fn(profile);

      // 成功：更新 lastGoodAt
      profile.lastGoodAt = Date.now();
      profile.failureCount = 0;

      return { success: true, data, profileId };
    } catch (err) {
      const reason = params.classifyError(err);
      lastError = err instanceof Error ? err.message : String(err);

      // 设置冷却期
      const cooldownMs = calculateCooldownMs(reason);
      profile.cooldown = {
        reason,
        until: cooldownMs === Infinity ? Infinity : Date.now() + cooldownMs,
      };
      profile.failureCount = (profile.failureCount ?? 0) + 1;

      // 永久性失败（auth/billing）：不继续尝试其他 profile
      if (reason === "auth" || reason === "billing") {
        break;
      }

      // 临时失败：继续尝试下一个 profile
    }
  }

  return { success: false, error: lastError, allProfilesExhausted: true };
}

// ============================================================
// 测试验证
// ============================================================

async function runTests() {
  console.log("=== 答案 8 测试 ===\n");

  // calculateCooldownMs
  console.assert(calculateCooldownMs("rate_limit") === 60_000);
  console.assert(calculateCooldownMs("auth") === Infinity);
  console.assert(calculateCooldownMs("overload") === 5_000);
  console.log("✅ calculateCooldownMs 通过");

  // isProfileInCooldown
  const now = Date.now();
  console.assert(isProfileInCooldown({ id: "p1", apiKey: "k1", cooldown: { reason: "rate_limit", until: now + 60_000 } }, now) === true);
  console.assert(isProfileInCooldown({ id: "p2", apiKey: "k2", cooldown: { reason: "rate_limit", until: now - 1_000 } }, now) === false);
  console.assert(isProfileInCooldown({ id: "p3", apiKey: "k3" }, now) === false);
  console.log("✅ isProfileInCooldown 通过");

  // resolveProfileOrder
  const profiles: AuthProfile[] = [
    { id: "p1", apiKey: "k1", lastGoodAt: now - 60_000 },
    { id: "p2", apiKey: "k2", lastGoodAt: now - 10_000 },
    { id: "p3", apiKey: "k3", cooldown: { reason: "rate_limit", until: now + 30_000 } },
    { id: "p4", apiKey: "k4", lastGoodAt: now - 5_000 },
  ];
  const order = resolveProfileOrder({ profiles, now });
  console.assert(!order.includes("p3"), "❌ p3 不应出现");
  console.assert(order[0] === "p4", `❌ p4 应排第一，得到 ${order[0]}`);
  console.log(`✅ 排序: [${order.join(", ")}]`);

  // withAuthFailover
  const testProfiles: AuthProfile[] = [
    { id: "p1", apiKey: "k1-bad" },
    { id: "p2", apiKey: "k2-good" },
  ];

  let callCount = 0;
  const result = await withAuthFailover({
    profiles: testProfiles,
    fn: async (profile) => {
      callCount++;
      if (profile.id === "p1") throw new Error("HTTP 429: rate limit");
      return `success with ${profile.id}`;
    },
    classifyError: (err) => String(err).includes("429") ? "rate_limit" : "unknown",
  });

  console.assert(result.success === true && result.profileId === "p2");
  console.assert(testProfiles[0].cooldown !== undefined);
  console.assert(testProfiles[1].lastGoodAt !== undefined);
  console.log(`✅ 故障转移成功: 尝试 ${callCount} 次`);

  // auth 错误立即停止
  let authCalls = 0;
  const authResult = await withAuthFailover({
    profiles: [{ id: "p1", apiKey: "k1" }, { id: "p2", apiKey: "k2" }],
    fn: async () => { authCalls++; throw new Error("HTTP 401"); },
    classifyError: (err) => String(err).includes("401") ? "auth" : "unknown",
  });
  console.assert(!authResult.success && authCalls === 1);
  console.log(`✅ auth 错误立即停止: ${authCalls} 次调用`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
