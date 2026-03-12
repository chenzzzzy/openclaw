/**
 * 练习题 1：上下文窗口管理与 Token 预算
 *
 * 背景：
 * 你正在为一个 AI Agent 框架实现上下文窗口管理模块。
 * 不同的 LLM 有不同的上下文限制，管理员也可能希望强制限制最大上下文（控制成本）。
 * 你需要实现一套优先级驱动的上下文窗口解析机制。
 *
 * 任务 1：实现 resolveContextWindowTokens 函数
 * 按照以下优先级（高→低）解析上下文窗口大小：
 *   1. adminCap（管理员强制上限，若设置且小于其他来源，则使用此值）
 *   2. modelsConfig（用户在配置文件中自定义的值）
 *   3. modelApi（模型 API 返回的值）
 *   4. defaultTokens（系统默认值）
 *
 * 任务 2：实现 evaluateContextBudget 函数
 * 给定当前已用 token 数，评估是否应该警告或阻止继续生成：
 *   - shouldBlock: 剩余 token < HARD_MIN_TOKENS（16000）时阻止
 *   - shouldWarn: 剩余 token < WARN_BELOW_TOKENS（32000）时警告
 */

// ============================================================
// 类型定义（不需要修改）
// ============================================================

export type ContextWindowSource =
  | "adminCap"      // 管理员强制上限
  | "modelsConfig"  // 用户配置文件
  | "modelApi"      // LLM API 返回值
  | "default";      // 系统默认

export type ContextWindowInfo = {
  tokens: number;
  source: ContextWindowSource;
};

export type ContextBudgetResult = {
  remainingTokens: number;
  shouldWarn: boolean;
  shouldBlock: boolean;
};

export const HARD_MIN_TOKENS = 16_000;
export const WARN_BELOW_TOKENS = 32_000;
export const DEFAULT_CONTEXT_TOKENS = 200_000;

// ============================================================
// 练习 1.1：实现 resolveContextWindowTokens
// ============================================================

/**
 * 按优先级解析上下文窗口大小
 *
 * @param params.adminCap - 管理员强制上限（可能 undefined）
 * @param params.modelsConfig - 配置文件中的值（可能 undefined）
 * @param params.modelApi - 模型 API 返回的上下文窗口大小（可能 undefined）
 * @param params.defaultTokens - 系统默认值（保证存在）
 *
 * @example
 * resolveContextWindowTokens({ adminCap: 50000, modelApi: 200000, defaultTokens: 200000 })
 * // → { tokens: 50000, source: "adminCap" }  (管理员上限生效)
 *
 * resolveContextWindowTokens({ modelsConfig: 32000, modelApi: 128000, defaultTokens: 200000 })
 * // → { tokens: 32000, source: "modelsConfig" }  (用户配置优先)
 *
 * resolveContextWindowTokens({ modelApi: 128000, defaultTokens: 200000 })
 * // → { tokens: 128000, source: "modelApi" }
 *
 * resolveContextWindowTokens({ defaultTokens: 200000 })
 * // → { tokens: 200000, source: "default" }
 */
export function resolveContextWindowTokens(params: {
  adminCap?: number;
  modelsConfig?: number;
  modelApi?: number;
  defaultTokens: number;
}): ContextWindowInfo {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 1.2：实现 evaluateContextBudget
// ============================================================

/**
 * 评估 token 预算是否足够
 *
 * @param contextTokens - 总上下文窗口大小
 * @param usedTokens - 当前已用 token 数（prompt tokens）
 *
 * @example
 * evaluateContextBudget(128000, 120000)
 * // → { remainingTokens: 8000, shouldWarn: true, shouldBlock: true }
 *
 * evaluateContextBudget(128000, 90000)
 * // → { remainingTokens: 38000, shouldWarn: false, shouldBlock: false }
 *
 * evaluateContextBudget(128000, 100000)
 * // → { remainingTokens: 28000, shouldWarn: true, shouldBlock: false }
 */
export function evaluateContextBudget(
  contextTokens: number,
  usedTokens: number,
): ContextBudgetResult {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例（运行验证：npx ts-node exercises/ex01-context-window.ts）
// ============================================================

function runTests() {
  console.log("=== 练习 1.1：resolveContextWindowTokens ===\n");

  // 测试 1：管理员上限 < modelApi → 使用 adminCap
  const r1 = resolveContextWindowTokens({
    adminCap: 50_000,
    modelApi: 200_000,
    defaultTokens: 200_000,
  });
  console.assert(r1.tokens === 50_000, `❌ 测试1: 期望 50000，得到 ${r1.tokens}`);
  console.assert(r1.source === "adminCap", `❌ 测试1: 期望 adminCap，得到 ${r1.source}`);
  console.log(`✅ 测试1 通过: tokens=${r1.tokens}, source=${r1.source}`);

  // 测试 2：adminCap > modelApi → 不生效，用 modelApi（adminCap 只做上限，不做下限）
  const r2 = resolveContextWindowTokens({
    adminCap: 300_000,
    modelApi: 128_000,
    defaultTokens: 200_000,
  });
  console.assert(r2.tokens === 128_000, `❌ 测试2: 期望 128000，得到 ${r2.tokens}`);
  console.assert(r2.source === "modelApi", `❌ 测试2: 期望 modelApi，得到 ${r2.source}`);
  console.log(`✅ 测试2 通过: tokens=${r2.tokens}, source=${r2.source}`);

  // 测试 3：modelsConfig 优先于 modelApi
  const r3 = resolveContextWindowTokens({
    modelsConfig: 32_000,
    modelApi: 128_000,
    defaultTokens: 200_000,
  });
  console.assert(r3.tokens === 32_000, `❌ 测试3: 期望 32000，得到 ${r3.tokens}`);
  console.assert(r3.source === "modelsConfig", `❌ 测试3: 期望 modelsConfig，得到 ${r3.source}`);
  console.log(`✅ 测试3 通过: tokens=${r3.tokens}, source=${r3.source}`);

  // 测试 4：只有默认值
  const r4 = resolveContextWindowTokens({ defaultTokens: 200_000 });
  console.assert(r4.tokens === 200_000, `❌ 测试4: 期望 200000，得到 ${r4.tokens}`);
  console.assert(r4.source === "default", `❌ 测试4: 期望 default，得到 ${r4.source}`);
  console.log(`✅ 测试4 通过: tokens=${r4.tokens}, source=${r4.source}`);

  // 测试 5：无效值（0 或负数）应该被忽略
  const r5 = resolveContextWindowTokens({
    modelsConfig: -1,   // 无效，应忽略
    modelApi: 0,        // 无效，应忽略
    defaultTokens: 200_000,
  });
  console.assert(r5.tokens === 200_000, `❌ 测试5: 无效值应该被忽略，得到 ${r5.tokens}`);
  console.log(`✅ 测试5 通过: tokens=${r5.tokens}, source=${r5.source}`);

  console.log("\n=== 练习 1.2：evaluateContextBudget ===\n");

  // 测试 6：剩余不足 HARD_MIN → shouldBlock
  const r6 = evaluateContextBudget(128_000, 120_000);
  console.assert(r6.remainingTokens === 8_000, `❌ 测试6: 期望 8000`);
  console.assert(r6.shouldBlock === true, "❌ 测试6: 应该 shouldBlock");
  console.assert(r6.shouldWarn === true, "❌ 测试6: 应该 shouldWarn");
  console.log(`✅ 测试6 通过: remaining=${r6.remainingTokens}, warn=${r6.shouldWarn}, block=${r6.shouldBlock}`);

  // 测试 7：剩余 < WARN_BELOW 但 > HARD_MIN → shouldWarn only
  const r7 = evaluateContextBudget(128_000, 100_000);
  console.assert(r7.remainingTokens === 28_000, `❌ 测试7: 期望 28000`);
  console.assert(r7.shouldWarn === true, "❌ 测试7: 应该 shouldWarn");
  console.assert(r7.shouldBlock === false, "❌ 测试7: 不应该 shouldBlock");
  console.log(`✅ 测试7 通过: remaining=${r7.remainingTokens}, warn=${r7.shouldWarn}, block=${r7.shouldBlock}`);

  // 测试 8：剩余充足 → 无警告无阻止
  const r8 = evaluateContextBudget(128_000, 50_000);
  console.assert(r8.shouldWarn === false, "❌ 测试8: 不应该 shouldWarn");
  console.assert(r8.shouldBlock === false, "❌ 测试8: 不应该 shouldBlock");
  console.log(`✅ 测试8 通过: remaining=${r8.remainingTokens}, warn=${r8.shouldWarn}, block=${r8.shouldBlock}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
