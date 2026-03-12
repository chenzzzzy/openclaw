/**
 * 标准答案 1：上下文窗口管理与 Token 预算
 */

export type ContextWindowSource =
  | "adminCap"
  | "modelsConfig"
  | "modelApi"
  | "default";

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

function isValidPositiveInt(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.floor(value) > 0
  );
}

/**
 * 按优先级解析上下文窗口大小
 *
 * 优先级链（高→低）：
 * 1. modelsConfig（用户配置） → 选出基准值
 * 2. modelApi（API 返回值） → 选出基准值
 * 3. defaultTokens → 兜底
 * 然后：如果 adminCap 存在且 < 基准值，用 adminCap 覆盖（管理员只做上限限制）
 */
export function resolveContextWindowTokens(params: {
  adminCap?: number;
  modelsConfig?: number;
  modelApi?: number;
  defaultTokens: number;
}): ContextWindowInfo {
  // 步骤1：按优先级选出基准值（modelsConfig > modelApi > default）
  let baseInfo: ContextWindowInfo;

  if (isValidPositiveInt(params.modelsConfig)) {
    baseInfo = { tokens: params.modelsConfig, source: "modelsConfig" };
  } else if (isValidPositiveInt(params.modelApi)) {
    baseInfo = { tokens: params.modelApi, source: "modelApi" };
  } else {
    baseInfo = { tokens: Math.floor(params.defaultTokens), source: "default" };
  }

  // 步骤2：管理员上限检查（只有 adminCap < 基准值时才生效）
  if (isValidPositiveInt(params.adminCap) && params.adminCap < baseInfo.tokens) {
    return { tokens: params.adminCap, source: "adminCap" };
  }

  return baseInfo;
}

/**
 * 评估 token 预算是否足够
 */
export function evaluateContextBudget(
  contextTokens: number,
  usedTokens: number,
): ContextBudgetResult {
  const remainingTokens = contextTokens - usedTokens;
  return {
    remainingTokens,
    shouldWarn: remainingTokens < WARN_BELOW_TOKENS,
    shouldBlock: remainingTokens < HARD_MIN_TOKENS,
  };
}

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 1.1：resolveContextWindowTokens ===\n");

  const r1 = resolveContextWindowTokens({ adminCap: 50_000, modelApi: 200_000, defaultTokens: 200_000 });
  console.assert(r1.tokens === 50_000 && r1.source === "adminCap", `❌ 测试1: ${JSON.stringify(r1)}`);
  console.log(`✅ 测试1: adminCap 生效: ${r1.tokens} (${r1.source})`);

  const r2 = resolveContextWindowTokens({ adminCap: 300_000, modelApi: 128_000, defaultTokens: 200_000 });
  console.assert(r2.tokens === 128_000 && r2.source === "modelApi", `❌ 测试2: ${JSON.stringify(r2)}`);
  console.log(`✅ 测试2: adminCap > modelApi，不生效: ${r2.tokens} (${r2.source})`);

  const r3 = resolveContextWindowTokens({ modelsConfig: 32_000, modelApi: 128_000, defaultTokens: 200_000 });
  console.assert(r3.tokens === 32_000 && r3.source === "modelsConfig", `❌ 测试3: ${JSON.stringify(r3)}`);
  console.log(`✅ 测试3: modelsConfig 优先: ${r3.tokens} (${r3.source})`);

  const r4 = resolveContextWindowTokens({ defaultTokens: 200_000 });
  console.assert(r4.tokens === 200_000 && r4.source === "default", `❌ 测试4`);
  console.log(`✅ 测试4: 默认值: ${r4.tokens} (${r4.source})`);

  const r5 = resolveContextWindowTokens({ modelsConfig: -1, modelApi: 0, defaultTokens: 200_000 });
  console.assert(r5.tokens === 200_000 && r5.source === "default", `❌ 测试5: 无效值应被忽略`);
  console.log(`✅ 测试5: 无效值被忽略: ${r5.tokens} (${r5.source})`);

  console.log("\n=== 答案 1.2：evaluateContextBudget ===\n");

  const r6 = evaluateContextBudget(128_000, 120_000);
  console.assert(r6.remainingTokens === 8_000 && r6.shouldBlock && r6.shouldWarn, `❌ 测试6`);
  console.log(`✅ 测试6: remaining=${r6.remainingTokens}, warn=${r6.shouldWarn}, block=${r6.shouldBlock}`);

  const r7 = evaluateContextBudget(128_000, 100_000);
  console.assert(r7.remainingTokens === 28_000 && r7.shouldWarn && !r7.shouldBlock, `❌ 测试7`);
  console.log(`✅ 测试7: remaining=${r7.remainingTokens}, warn=${r7.shouldWarn}, block=${r7.shouldBlock}`);

  const r8 = evaluateContextBudget(128_000, 50_000);
  console.assert(r8.remainingTokens === 78_000 && !r8.shouldWarn && !r8.shouldBlock, `❌ 测试8`);
  console.log(`✅ 测试8: remaining=${r8.remainingTokens}, warn=${r8.shouldWarn}, block=${r8.shouldBlock}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
