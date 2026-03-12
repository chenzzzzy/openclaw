/**
 * 练习题 7：对话压缩（Context Compaction）
 *
 * 背景：
 * 当对话历史超过上下文窗口限制时，需要将早期对话"压缩"为摘要。
 * 关键挑战：压缩时不能丢失关键信息（尤其是任务进度和精确标识符）。
 *
 * 任务 1：实现 estimateMessageTokens（粗略估算消息 token 数）
 * 任务 2：实现 splitMessagesByTokenShare（将消息列表按 token 份额分块）
 * 任务 3：实现 shouldCompact（判断是否需要触发压缩）
 * 任务 4：实现 planCompaction（制定压缩计划：选择需要被压缩的消息范围）
 */

// ============================================================
// 类型定义
// ============================================================

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type CompactionPlan = {
  toCompact: Message[];    // 需要被压缩的消息（早期历史）
  toKeep: Message[];       // 保留的消息（最近历史）
  shouldCompact: boolean;  // 是否真的需要压缩
};

// ============================================================
// 练习 7.1：实现 estimateMessageTokens
// ============================================================

/**
 * 粗略估算一条消息的 token 数
 *
 * 简化规则（实际生产中更复杂）：
 * - 英文：每 4 个字符 ≈ 1 个 token
 * - 中文/日文等：每个字符 ≈ 1.5 个 token（Unicode > 0x7F 视为宽字符）
 * - 取整（向上取整）
 * - 额外加 4 个 token（消息的角色标记开销）
 *
 * @example
 * estimateMessageTokens({ role: "user", content: "Hello world!" })
 * // "Hello world!" = 12 字符，全英文
 * // 12 / 4 = 3 tokens + 4 overhead = 7 tokens
 *
 * estimateMessageTokens({ role: "user", content: "你好世界" })
 * // 4 个中文字符
 * // Math.ceil(4 * 1.5) = 6 tokens + 4 overhead = 10 tokens
 */
export function estimateMessageTokens(message: Message): number {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 7.2：实现 splitMessagesByTokenShare
// ============================================================

/**
 * 将消息列表按 token 数尽量均匀分成 N 份
 *
 * 规则：
 * - 每份的目标 token 数 = totalTokens / parts
 * - 逐条消息添加，当当前块超过目标大小（×1.1 宽松系数）且当前块不为空时，开始新块
 * - 最后剩余的消息作为最后一块
 *
 * @example
 * // 假设 5 条消息，每条 100 token，parts=2
 * // 目标每块 250 token（总 500 / 2 = 250）
 * // 块1：前 2 条（200 token）→ 第 3 条加入会超 275（>250×1.1=275 不超），加入
 * // 块1：前 3 条（300 token）→ 第 4 条加入会超 400（>275 超出），结束块1
 * // 块2：后 2 条
 * // 结果：[[msg1,msg2,msg3], [msg4,msg5]]
 */
export function splitMessagesByTokenShare(
  messages: Message[],
  parts: number,
): Message[][] {
  // TODO: 实现此函数
  // 边界条件：
  // - messages 为空：返回 []
  // - parts <= 1：返回 [messages]
  // - parts >= messages.length：每条消息单独一块
  throw new Error("Not implemented");
}

// ============================================================
// 练习 7.3：实现 shouldCompactHistory
// ============================================================

/**
 * 判断是否需要触发对话压缩
 *
 * 触发条件：
 *   估算的历史 token 数 > contextWindow × compactionThreshold
 *   AND 历史消息数 >= minMessages（至少有足够多消息才值得压缩）
 *
 * @param messages - 当前对话历史
 * @param contextWindow - 上下文窗口大小（token）
 * @param compactionThreshold - 触发阈值（默认 0.75，即超过 75% 时压缩）
 * @param minMessages - 最少消息数才触发压缩（默认 6）
 *
 * @example
 * // contextWindow=10000，threshold=0.75，minMessages=6
 * // histories 中有 8 条消息，估算 8000 token
 * // 8000 > 10000 × 0.75 = 7500 → 需要压缩
 */
export function shouldCompactHistory(
  messages: Message[],
  contextWindow: number,
  compactionThreshold = 0.75,
  minMessages = 6,
): boolean {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 7.4：实现 planCompaction
// ============================================================

/**
 * 制定压缩计划：决定哪些消息压缩，哪些保留
 *
 * 规则：
 * - 压缩比例（compactRatio）= clamp(BASE_CHUNK_RATIO, MIN_CHUNK_RATIO, max)
 *   其中 BASE_CHUNK_RATIO = 0.4，MIN_CHUNK_RATIO = 0.15
 *   max = Math.max(MIN_CHUNK_RATIO, 1 - contextWindow / estimatedTokens)
 * - 压缩消息数 = Math.floor(messages.length × compactRatio)
 * - 前 compactCount 条消息被压缩，其余保留
 * - 如果 estimatedTokens <= contextWindow × 0.75（不需要压缩），返回 shouldCompact=false
 */
export const BASE_CHUNK_RATIO = 0.4;
export const MIN_CHUNK_RATIO = 0.15;

export function planCompaction(
  messages: Message[],
  contextWindow: number,
): CompactionPlan {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log("=== 练习 7.1：estimateMessageTokens ===\n");

  const e1 = estimateMessageTokens({ role: "user", content: "Hello world!" });
  // "Hello world!" = 12 chars, all ASCII → Math.ceil(12/4) = 3 + 4 = 7
  console.assert(e1 === 7, `❌ 期望 7，得到 ${e1}`);
  console.log(`✅ 英文: "Hello world!" → ${e1} tokens`);

  const e2 = estimateMessageTokens({ role: "user", content: "你好世界" });
  // 4 宽字符 → Math.ceil(4 × 1.5) = 6 + 4 = 10
  console.assert(e2 === 10, `❌ 期望 10，得到 ${e2}`);
  console.log(`✅ 中文: "你好世界" → ${e2} tokens`);

  const e3 = estimateMessageTokens({ role: "assistant", content: "" });
  // 空字符串，只有 overhead = 4
  console.assert(e3 === 4, `❌ 期望 4（空字符串），得到 ${e3}`);
  console.log(`✅ 空内容 → ${e3} tokens (overhead only)`);

  console.log("\n=== 练习 7.2：splitMessagesByTokenShare ===\n");

  // 创建测试消息（每条约 100 字符 ≈ 25 tokens）
  const makeMsg = (i: number): Message => ({
    role: "user",
    content: "x".repeat(100) + ` msg${i}`,
  });

  const msgs = Array.from({ length: 6 }, (_, i) => makeMsg(i));

  // parts=1：返回全部
  const s1 = splitMessagesByTokenShare(msgs, 1);
  console.assert(s1.length === 1, `❌ parts=1 应返回 1 块`);
  console.assert(s1[0].length === 6, `❌ 块内应有 6 条消息`);
  console.log(`✅ parts=1: [${s1.map(b => b.length).join(", ")}]`);

  // parts=2：应分成 2 块
  const s2 = splitMessagesByTokenShare(msgs, 2);
  console.assert(s2.length >= 2, `❌ parts=2 应至少返回 2 块`);
  const totalMsgs = s2.reduce((sum, b) => sum + b.length, 0);
  console.assert(totalMsgs === 6, `❌ 分块后总消息数应仍为 6，得到 ${totalMsgs}`);
  console.log(`✅ parts=2: [${s2.map(b => b.length).join(", ")}]`);

  // 空列表
  const s3 = splitMessagesByTokenShare([], 2);
  console.assert(s3.length === 0, `❌ 空列表应返回 []`);
  console.log(`✅ 空列表: []`);

  console.log("\n=== 练习 7.3：shouldCompactHistory ===\n");

  // 创建估算约 1000 token 的消息（每条约 125 token ≈ 500 chars）
  const bigMsg = (): Message => ({ role: "user", content: "x".repeat(480) });
  const fewMsgs = Array.from({ length: 3 }, bigMsg);  // 约 375 token，3 条
  const manyMsgs = Array.from({ length: 10 }, bigMsg); // 约 1250 token，10 条

  // 不触发：token 不足
  const sc1 = shouldCompactHistory(fewMsgs, 2000);
  console.assert(sc1 === false, `❌ token 不足时不应触发压缩`);
  console.log(`✅ token 不足: ${sc1}`);

  // 不触发：消息太少
  const sc2 = shouldCompactHistory(fewMsgs, 500, 0.75, 6);
  console.assert(sc2 === false, `❌ 消息太少（3<6）不应触发压缩`);
  console.log(`✅ 消息太少: ${sc2}`);

  // 触发：超过阈值且消息够多
  const sc3 = shouldCompactHistory(manyMsgs, 1000, 0.75, 6);
  console.assert(sc3 === true, `❌ 超过阈值且消息够多应触发压缩`);
  console.log(`✅ 触发压缩: ${sc3}`);

  console.log("\n=== 练习 7.4：planCompaction ===\n");

  const historyMsgs: Message[] = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: "x".repeat(400),   // 约 100 tokens 每条
  }));

  // 触发压缩场景：contextWindow=500，估算 ~1000 token
  const plan = planCompaction(historyMsgs, 500);
  if (plan.shouldCompact) {
    console.assert(plan.toCompact.length > 0, "❌ 需要压缩的消息应该 > 0");
    console.assert(plan.toKeep.length > 0, "❌ 保留的消息应该 > 0");
    console.assert(
      plan.toCompact.length + plan.toKeep.length === historyMsgs.length,
      "❌ 总消息数应保持不变"
    );
    console.log(`✅ 压缩计划: 压缩 ${plan.toCompact.length} 条，保留 ${plan.toKeep.length} 条`);
  } else {
    console.log("ℹ️  估算 token 不足，不触发压缩");
  }

  // 不触发压缩场景：contextWindow 很大
  const noPlan = planCompaction(historyMsgs, 100_000);
  console.assert(noPlan.shouldCompact === false, "❌ 上下文充足时不应压缩");
  console.log(`✅ 不触发压缩: shouldCompact=${noPlan.shouldCompact}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
