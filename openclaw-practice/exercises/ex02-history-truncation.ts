/**
 * 练习题 2：对话历史截断策略
 *
 * 背景：
 * Agent 的对话历史会随时间无限增长，必须截断以控制 token 消耗。
 * 截断需要以"用户轮次"为单位（而非消息条数），保证截断后消息结构的语义完整性。
 *
 * 任务 1：实现 limitHistoryTurns 函数
 * 保留最后 N 个用户轮次（及其对应的助手回复），丢弃更早的消息。
 *
 * 任务 2：实现 getHistoryLimit 函数
 * 根据 session key 解析出应用哪个历史限制配置。
 */

// ============================================================
// 类型定义（不需要修改）
// ============================================================

export type MessageRole = "user" | "assistant" | "system";

export type Message = {
  role: MessageRole;
  content: string;
};

export type ChannelHistoryConfig = {
  historyLimit?: number;     // 群组/频道的历史限制
  dmHistoryLimit?: number;   // DM 的历史限制
  dms?: Record<string, { historyLimit?: number }>;  // 特定用户的历史限制
};

export type AgentConfig = {
  channels?: Record<string, ChannelHistoryConfig>;
};

// ============================================================
// 练习 2.1：实现 limitHistoryTurns
// ============================================================

/**
 * 保留最后 N 个用户轮次的对话历史
 *
 * 一个"用户轮次"由一条 user 消息及其后续所有 assistant 消息组成。
 * 注意：system 消息不计入轮次计数，应始终保留（如果存在）。
 *
 * @param messages - 完整对话历史
 * @param limit - 最大保留的用户轮次数（undefined 或 0 表示不限制）
 *
 * @example
 * const messages = [
 *   { role: "system", content: "You are helpful" },
 *   { role: "user", content: "Hello" },         // 轮次 1
 *   { role: "assistant", content: "Hi!" },
 *   { role: "user", content: "How are you?" },  // 轮次 2
 *   { role: "assistant", content: "Fine." },
 *   { role: "user", content: "Tell me a joke" },// 轮次 3（最新）
 *   { role: "assistant", content: "Why did..." },
 * ];
 *
 * limitHistoryTurns(messages, 2)
 * // 保留轮次 2 和轮次 3：
 * // [
 * //   { role: "user", content: "How are you?" },
 * //   { role: "assistant", content: "Fine." },
 * //   { role: "user", content: "Tell me a joke" },
 * //   { role: "assistant", content: "Why did..." },
 * // ]
 * // 注意：system 消息不在结果中（本实现简化处理）
 */
export function limitHistoryTurns(messages: Message[], limit: number | undefined): Message[] {
  // TODO: 实现此函数
  // 提示：
  // 1. limit 为 undefined 或 <= 0 时，返回原数组
  // 2. 从后往前扫描，计数 user 消息
  // 3. 当 user 消息数超过 limit 时，从当前位置截取
  throw new Error("Not implemented");
}

// ============================================================
// 练习 2.2：实现 getHistoryLimit
// ============================================================

/**
 * 根据 session key 和配置，解析应使用的历史截断限制
 *
 * Session Key 格式：agent:{agentId}:{channel}:{kind}:{peerId}
 * 例如：
 *   "agent:main:telegram:dm:123456789"
 *   "agent:main:discord:group:987654321"
 *   "agent:main:slack:dm:U12345678"
 *
 * 优先级（高→低）：
 *   1. 特定用户的 DM 限制（dms[userId].historyLimit）
 *   2. DM 类型的全局限制（dmHistoryLimit）
 *   3. 渠道的通用限制（historyLimit）
 *   4. undefined（不限制）
 *
 * @example
 * getHistoryLimit("agent:main:telegram:dm:123456789", {
 *   channels: {
 *     telegram: {
 *       dmHistoryLimit: 20,
 *       dms: { "123456789": { historyLimit: 50 } }
 *     }
 *   }
 * })
 * // → 50（特定用户的配置优先）
 *
 * getHistoryLimit("agent:main:telegram:dm:999999999", {
 *   channels: { telegram: { dmHistoryLimit: 20 } }
 * })
 * // → 20（DM 默认配置）
 *
 * getHistoryLimit("agent:main:discord:group:123", {
 *   channels: { discord: { historyLimit: 10 } }
 * })
 * // → 10（群组配置）
 */
export function getHistoryLimit(
  sessionKey: string | undefined,
  config: AgentConfig | undefined,
): number | undefined {
  // TODO: 实现此函数
  // 提示：
  // 1. 解析 sessionKey 格式
  // 2. 提取 channel（如 "telegram"）和 kind（如 "dm" 或 "group"）
  // 3. 按优先级查找配置
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log("=== 练习 2.1：limitHistoryTurns ===\n");

  const messages: Message[] = [
    { role: "user", content: "Hello" },          // 轮次 1
    { role: "assistant", content: "Hi!" },
    { role: "user", content: "How are you?" },   // 轮次 2
    { role: "assistant", content: "Fine." },
    { role: "user", content: "Tell me a joke" }, // 轮次 3
    { role: "assistant", content: "Why did the programmer..." },
  ];

  // 测试 1：limit=2，保留最后 2 轮
  const r1 = limitHistoryTurns(messages, 2);
  console.assert(r1.length === 4, `❌ 测试1: 期望 4 条消息，得到 ${r1.length}`);
  console.assert(r1[0].content === "How are you?", `❌ 测试1: 第一条应是轮次2的user消息`);
  console.assert(r1[2].content === "Tell me a joke", `❌ 测试1: 第三条应是轮次3的user消息`);
  console.log(`✅ 测试1 通过: 保留了 ${r1.length} 条消息`);

  // 测试 2：limit=0，不截断
  const r2 = limitHistoryTurns(messages, 0);
  console.assert(r2.length === messages.length, `❌ 测试2: limit=0 应返回全部消息`);
  console.log(`✅ 测试2 通过: limit=0 返回全部 ${r2.length} 条`);

  // 测试 3：limit=undefined，不截断
  const r3 = limitHistoryTurns(messages, undefined);
  console.assert(r3.length === messages.length, `❌ 测试3: limit=undefined 应返回全部消息`);
  console.log(`✅ 测试3 通过: limit=undefined 返回全部 ${r3.length} 条`);

  // 测试 4：limit 大于实际轮次数，返回全部
  const r4 = limitHistoryTurns(messages, 10);
  console.assert(r4.length === messages.length, `❌ 测试4: limit > 实际轮次应返回全部`);
  console.log(`✅ 测试4 通过: limit=10 (只有3轮) 返回全部 ${r4.length} 条`);

  // 测试 5：空消息列表
  const r5 = limitHistoryTurns([], 5);
  console.assert(r5.length === 0, `❌ 测试5: 空列表应返回空列表`);
  console.log(`✅ 测试5 通过: 空列表处理正确`);

  // 测试 6：limit=1，只保留最后 1 轮
  const r6 = limitHistoryTurns(messages, 1);
  console.assert(r6.length === 2, `❌ 测试6: 期望 2 条消息，得到 ${r6.length}`);
  console.assert(r6[0].content === "Tell me a joke", `❌ 测试6: 第一条应是最后轮次的user消息`);
  console.log(`✅ 测试6 通过: limit=1 返回 ${r6.length} 条`);

  console.log("\n=== 练习 2.2：getHistoryLimit ===\n");

  const config: AgentConfig = {
    channels: {
      telegram: {
        historyLimit: 10,
        dmHistoryLimit: 20,
        dms: {
          "123456789": { historyLimit: 50 },
        },
      },
      discord: {
        historyLimit: 15,
      },
    },
  };

  // 测试 7：特定用户 DM，使用个人配置
  const r7 = getHistoryLimit("agent:main:telegram:dm:123456789", config);
  console.assert(r7 === 50, `❌ 测试7: 期望 50，得到 ${r7}`);
  console.log(`✅ 测试7 通过: 特定用户 DM 限制 = ${r7}`);

  // 测试 8：未知 DM 用户，使用 dmHistoryLimit
  const r8 = getHistoryLimit("agent:main:telegram:dm:999999", config);
  console.assert(r8 === 20, `❌ 测试8: 期望 20，得到 ${r8}`);
  console.log(`✅ 测试8 通过: DM 默认限制 = ${r8}`);

  // 测试 9：群组，使用 historyLimit
  const r9 = getHistoryLimit("agent:main:discord:group:987654321", config);
  console.assert(r9 === 15, `❌ 测试9: 期望 15，得到 ${r9}`);
  console.log(`✅ 测试9 通过: 群组限制 = ${r9}`);

  // 测试 10：未配置的渠道，返回 undefined
  const r10 = getHistoryLimit("agent:main:whatsapp:dm:1234567", config);
  console.assert(r10 === undefined, `❌ 测试10: 期望 undefined，得到 ${r10}`);
  console.log(`✅ 测试10 通过: 未配置渠道返回 undefined`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
