/**
 * 标准答案 7：对话压缩（Context Compaction）
 */

export type Message = { role: "user" | "assistant" | "system"; content: string };
export type CompactionPlan = {
  toCompact: Message[]; toKeep: Message[]; shouldCompact: boolean;
};
export const BASE_CHUNK_RATIO = 0.4;
export const MIN_CHUNK_RATIO = 0.15;

/**
 * 粗略估算消息 token 数
 * 英文：4 字符 ≈ 1 token；宽字符（中文等）：1 字符 ≈ 1.5 token
 * 加 4 个 overhead token
 */
export function estimateMessageTokens(message: Message): number {
  let tokenCount = 0;
  for (const char of message.content) {
    if (char.codePointAt(0)! > 0x7f) {
      tokenCount += 1.5;  // 宽字符（中文、日文等）
    } else {
      tokenCount += 0.25; // 英文字符（4 个 ≈ 1 token）
    }
  }
  return Math.ceil(tokenCount) + 4;  // +4 overhead（角色标记）
}

/**
 * 将消息按 token 份额分成 N 块
 */
export function splitMessagesByTokenShare(messages: Message[], parts: number): Message[][] {
  if (messages.length === 0) return [];

  const normalizedParts = Math.min(Math.max(1, Math.floor(parts)), messages.length);
  if (normalizedParts <= 1) return [messages];

  const totalTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  const targetPerPart = totalTokens / normalizedParts;

  const result: Message[][] = [];
  let currentChunk: Message[] = [];
  let currentTokens = 0;

  for (const message of messages) {
    const msgTokens = estimateMessageTokens(message);

    // 如果当前块超过目标（×1.1宽松），且当前块非空，开始新块
    if (currentTokens + msgTokens > targetPerPart * 1.1 && currentChunk.length > 0) {
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

/**
 * 判断是否需要压缩
 */
export function shouldCompactHistory(
  messages: Message[],
  contextWindow: number,
  compactionThreshold = 0.75,
  minMessages = 6,
): boolean {
  if (messages.length < minMessages) return false;

  const estimatedTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  return estimatedTokens > contextWindow * compactionThreshold;
}

/**
 * 制定压缩计划
 */
export function planCompaction(messages: Message[], contextWindow: number): CompactionPlan {
  const estimatedTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);

  // 检查是否需要压缩（阈值 75%）
  if (estimatedTokens <= contextWindow * 0.75) {
    return { toCompact: [], toKeep: messages, shouldCompact: false };
  }

  // 计算压缩比例
  // max = 1 - contextWindow / estimatedTokens（必须压缩这么多才能放下）
  const maxRatio = 1 - contextWindow / estimatedTokens;
  const compactRatio = Math.max(MIN_CHUNK_RATIO, Math.min(BASE_CHUNK_RATIO, maxRatio));
  const compactCount = Math.floor(messages.length * compactRatio);

  if (compactCount <= 0) {
    return { toCompact: [], toKeep: messages, shouldCompact: false };
  }

  return {
    toCompact: messages.slice(0, compactCount),
    toKeep: messages.slice(compactCount),
    shouldCompact: true,
  };
}

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 7 测试 ===\n");

  // estimateMessageTokens
  const e1 = estimateMessageTokens({ role: "user", content: "Hello world!" });
  console.assert(e1 === 7, `❌ 期望 7，得到 ${e1}`);  // ceil(12*0.25)=3 + 4=7
  console.log(`✅ "Hello world!" → ${e1} tokens`);

  const e2 = estimateMessageTokens({ role: "user", content: "你好世界" });
  console.assert(e2 === 10, `❌ 期望 10，得到 ${e2}`);  // ceil(4*1.5)=6 + 4=10
  console.log(`✅ "你好世界" → ${e2} tokens`);

  const e3 = estimateMessageTokens({ role: "assistant", content: "" });
  console.assert(e3 === 4, `❌ 空内容应为 4（overhead）`);
  console.log(`✅ 空内容 → ${e3} tokens`);

  // splitMessagesByTokenShare
  const msgs = Array.from({ length: 6 }, (_, i): Message => ({
    role: "user", content: "x".repeat(100) + ` msg${i}`,
  }));

  const s1 = splitMessagesByTokenShare(msgs, 1);
  console.assert(s1.length === 1 && s1[0].length === 6, `❌ parts=1`);
  console.log(`✅ parts=1: [${s1.map(b => b.length).join(", ")}]`);

  const s2 = splitMessagesByTokenShare(msgs, 2);
  const total = s2.reduce((sum, b) => sum + b.length, 0);
  console.assert(total === 6, `❌ 总消息数应为 6，得到 ${total}`);
  console.log(`✅ parts=2: [${s2.map(b => b.length).join(", ")}]`);

  // shouldCompactHistory
  const bigMsg = (): Message => ({ role: "user", content: "x".repeat(480) });
  const manyMsgs = Array.from({ length: 10 }, bigMsg);
  const sc = shouldCompactHistory(manyMsgs, 1000, 0.75, 6);
  console.assert(sc === true, "❌ 应该触发压缩");
  console.log(`✅ shouldCompact: ${sc}`);

  // planCompaction
  const histMsgs = Array.from({ length: 10 }, (_, i): Message => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: "x".repeat(400),
  }));

  const plan = planCompaction(histMsgs, 500);
  if (plan.shouldCompact) {
    console.assert(plan.toCompact.length + plan.toKeep.length === 10, "❌ 总数应为 10");
    console.log(`✅ 压缩计划: compact=${plan.toCompact.length}, keep=${plan.toKeep.length}`);
  }

  const noPlan = planCompaction(histMsgs, 100_000);
  console.assert(!noPlan.shouldCompact, "❌ 不应压缩");
  console.log(`✅ 不触发压缩: ${noPlan.shouldCompact}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
