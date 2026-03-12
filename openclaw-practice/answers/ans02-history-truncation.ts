/**
 * 标准答案 2：对话历史截断策略
 */

export type MessageRole = "user" | "assistant" | "system";
export type Message = { role: MessageRole; content: string };
export type ChannelHistoryConfig = {
  historyLimit?: number;
  dmHistoryLimit?: number;
  dms?: Record<string, { historyLimit?: number }>;
};
export type AgentConfig = { channels?: Record<string, ChannelHistoryConfig> };

/**
 * 保留最后 N 个用户轮次
 *
 * 算法：从后往前扫描，计数 user 消息
 * 当 user 消息数超过 limit，从最后一次记录的 user 位置截取
 */
export function limitHistoryTurns(messages: Message[], limit: number | undefined): Message[] {
  if (!limit || limit <= 0 || messages.length === 0) {
    return messages;
  }

  let userCount = 0;
  let lastUserIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      userCount++;
      if (userCount > limit) {
        // 找到第 limit+1 个 user 消息，从上一次记录的 user 位置开始截取
        return messages.slice(lastUserIndex);
      }
      lastUserIndex = i;
    }
  }
  return messages;  // 消息总轮次 <= limit，全部保留
}

/**
 * 根据 session key 解析历史截断限制
 *
 * session key 格式：agent:{agentId}:{channel}:{kind}:{peerId}[:thread:{threadId}]
 */
export function getHistoryLimit(
  sessionKey: string | undefined,
  config: AgentConfig | undefined,
): number | undefined {
  if (!sessionKey || !config) return undefined;

  const parts = sessionKey.split(":").filter(Boolean);

  // 处理 "agent:agentId:..." 格式（跳过 agent 和 agentId）
  const baseParts = parts[0] === "agent" ? parts.slice(2) : parts;

  const channel = baseParts[0]?.toLowerCase();
  const kind = baseParts[1]?.toLowerCase();
  // 去掉 :thread:xxx 后缀
  const peerId = baseParts.slice(2).join(":").replace(/:thread:[^:]+$/, "");

  if (!channel) return undefined;

  const channelConfig = config.channels?.[channel];
  if (!channelConfig) return undefined;

  // 优先级：特定用户 DM > DM 默认 > 渠道通用
  if (kind === "dm" && peerId) {
    const dmOverride = channelConfig.dms?.[peerId]?.historyLimit;
    if (dmOverride != null) return dmOverride;
  }

  if (kind === "dm") {
    return channelConfig.dmHistoryLimit;
  }

  return channelConfig.historyLimit;
}

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 2.1：limitHistoryTurns ===\n");

  const messages: Message[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" },
    { role: "user", content: "How are you?" },
    { role: "assistant", content: "Fine." },
    { role: "user", content: "Tell me a joke" },
    { role: "assistant", content: "Why did the programmer..." },
  ];

  const r1 = limitHistoryTurns(messages, 2);
  console.assert(r1.length === 4 && r1[0].content === "How are you?", `❌ 测试1`);
  console.log(`✅ limit=2: ${r1.length} 条消息`);

  const r2 = limitHistoryTurns(messages, 0);
  console.assert(r2.length === 6, `❌ limit=0`);
  console.log(`✅ limit=0: 全部 ${r2.length} 条`);

  const r6 = limitHistoryTurns(messages, 1);
  console.assert(r6.length === 2 && r6[0].content === "Tell me a joke", `❌ limit=1`);
  console.log(`✅ limit=1: ${r6.length} 条`);

  console.log("\n=== 答案 2.2：getHistoryLimit ===\n");

  const config: AgentConfig = {
    channels: {
      telegram: {
        historyLimit: 10,
        dmHistoryLimit: 20,
        dms: { "123456789": { historyLimit: 50 } },
      },
      discord: { historyLimit: 15 },
    },
  };

  const r7 = getHistoryLimit("agent:main:telegram:dm:123456789", config);
  console.assert(r7 === 50, `❌ 期望 50，得到 ${r7}`);
  console.log(`✅ 特定用户 DM: ${r7}`);

  const r8 = getHistoryLimit("agent:main:telegram:dm:999999", config);
  console.assert(r8 === 20, `❌ 期望 20，得到 ${r8}`);
  console.log(`✅ DM 默认: ${r8}`);

  const r9 = getHistoryLimit("agent:main:discord:group:987654321", config);
  console.assert(r9 === 15, `❌ 期望 15，得到 ${r9}`);
  console.log(`✅ 群组: ${r9}`);

  const r10 = getHistoryLimit("agent:main:whatsapp:dm:1234567", config);
  console.assert(r10 === undefined, `❌ 期望 undefined`);
  console.log(`✅ 未知渠道: ${r10}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
