/**
 * 练习题 6：Agent 路由与 Session Key 设计
 *
 * 背景：
 * 支持多渠道、多 Agent 的平台需要精确的路由系统。
 * Session Key 是路由和状态管理的核心，其设计直接影响隔离性和扩展性。
 *
 * 任务 1：实现 buildSessionKey（构造规范化的 Session Key）
 * 任务 2：实现 parseSessionKey（解析 Session Key 的各个字段）
 * 任务 3：实现 resolveRoute（根据优先级链路由到正确的 Agent）
 */

// ============================================================
// 类型定义
// ============================================================

export type ChatKind = "dm" | "group" | "channel";

export type SessionKeyParams = {
  agentId: string;
  channel: string;
  kind: ChatKind;
  peerId: string;
  threadId?: string | number;
};

export type ParsedSessionKey = {
  agentId: string;
  channel: string;
  kind: ChatKind;
  peerId: string;
  threadId?: string;
};

export type Binding = {
  agentId: string;
  peerId?: string;           // 精确匹配某个用户/群组 ID
  channel?: string;          // 匹配某个渠道类型
  roleIds?: string[];        // 匹配 Discord 角色（需要同时匹配 guildId）
  guildId?: string;          // Discord 服务器 ID
};

export type RouteInput = {
  channel: string;
  kind: ChatKind;
  peerId: string;
  guildId?: string;
  memberRoleIds?: string[];
  bindings: Binding[];
  defaultAgentId: string;
};

export type RouteResult = {
  agentId: string;
  matchedBy: "binding.peer" | "binding.guild+roles" | "binding.guild" | "binding.channel" | "default";
};

// ============================================================
// 练习 6.1：实现 buildSessionKey
// ============================================================

/**
 * 构造规范化的 Session Key
 *
 * 格式：agent:{agentId}:{channel}:{kind}:{peerId}[:{threadId}]
 * 所有部分必须小写。
 *
 * @example
 * buildSessionKey({
 *   agentId: "Main",
 *   channel: "Telegram",
 *   kind: "dm",
 *   peerId: "123456789",
 * })
 * // → "agent:main:telegram:dm:123456789"
 *
 * buildSessionKey({
 *   agentId: "coder",
 *   channel: "slack",
 *   kind: "dm",
 *   peerId: "U12345678",
 *   threadId: "1234567890.123456",
 * })
 * // → "agent:coder:slack:dm:u12345678:thread:1234567890.123456"
 */
export function buildSessionKey(params: SessionKeyParams): string {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 6.2：实现 parseSessionKey
// ============================================================

/**
 * 解析 Session Key，提取各字段
 *
 * 支持格式：
 *   agent:{agentId}:{channel}:{kind}:{peerId}
 *   agent:{agentId}:{channel}:{kind}:{peerId}:thread:{threadId}
 *
 * @returns 解析后的字段，如果格式不合法则返回 null
 *
 * @example
 * parseSessionKey("agent:main:telegram:dm:123456789")
 * // → { agentId: "main", channel: "telegram", kind: "dm", peerId: "123456789" }
 *
 * parseSessionKey("agent:coder:slack:dm:u12345678:thread:1234567890.123456")
 * // → { agentId: "coder", channel: "slack", kind: "dm", peerId: "u12345678", threadId: "1234567890.123456" }
 *
 * parseSessionKey("invalid-key")
 * // → null
 */
export function parseSessionKey(key: string): ParsedSessionKey | null {
  // TODO: 实现此函数
  // 提示：
  // 1. 按 ":" 分割
  // 2. 检查第一段是否为 "agent"
  // 3. 提取各字段
  // 4. 检查是否有 ":thread:" 后缀
  throw new Error("Not implemented");
}

// ============================================================
// 练习 6.3：实现 resolveRoute
// ============================================================

/**
 * 按优先级链路由到正确的 Agent
 *
 * 优先级（高→低）：
 * 1. binding.peer：精确匹配 peerId 和 channel
 * 2. binding.guild+roles：peerId 是 guild 成员，且有匹配的角色
 * 3. binding.guild：匹配 guildId（Discord 服务器级别路由）
 * 4. binding.channel：匹配 channel 类型
 * 5. default：使用 defaultAgentId
 *
 * @example
 * resolveRoute({
 *   channel: "telegram",
 *   kind: "dm",
 *   peerId: "12345",
 *   bindings: [
 *     { agentId: "coder", peerId: "12345", channel: "telegram" },  // 精确匹配
 *     { agentId: "general", channel: "telegram" },
 *   ],
 *   defaultAgentId: "main",
 * })
 * // → { agentId: "coder", matchedBy: "binding.peer" }
 */
export function resolveRoute(input: RouteInput): RouteResult {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log("=== 练习 6.1：buildSessionKey ===\n");

  const k1 = buildSessionKey({
    agentId: "Main",
    channel: "Telegram",
    kind: "dm",
    peerId: "123456789",
  });
  console.assert(k1 === "agent:main:telegram:dm:123456789",
    `❌ 期望 "agent:main:telegram:dm:123456789"，得到 "${k1}"`);
  console.log(`✅ 基础 key: ${k1}`);

  const k2 = buildSessionKey({
    agentId: "coder",
    channel: "slack",
    kind: "dm",
    peerId: "U12345678",
    threadId: "1234567890.123456",
  });
  console.assert(k2 === "agent:coder:slack:dm:u12345678:thread:1234567890.123456",
    `❌ 期望带 thread，得到 "${k2}"`);
  console.log(`✅ 带 threadId: ${k2}`);

  const k3 = buildSessionKey({
    agentId: "main",
    channel: "discord",
    kind: "group",
    peerId: "987654321",
    threadId: 42,   // 数字类型
  });
  console.assert(k3.includes(":thread:42"), `❌ 数字 threadId 应转为字符串`);
  console.log(`✅ 数字 threadId: ${k3}`);

  console.log("\n=== 练习 6.2：parseSessionKey ===\n");

  const p1 = parseSessionKey("agent:main:telegram:dm:123456789");
  console.assert(p1 !== null, "❌ 应解析成功");
  console.assert(p1!.agentId === "main", `❌ agentId 期望 main，得到 ${p1!.agentId}`);
  console.assert(p1!.channel === "telegram", `❌ channel 期望 telegram`);
  console.assert(p1!.kind === "dm", `❌ kind 期望 dm`);
  console.assert(p1!.peerId === "123456789", `❌ peerId 期望 123456789`);
  console.assert(p1!.threadId === undefined, `❌ threadId 应为 undefined`);
  console.log(`✅ 解析 DM key:`, p1);

  const p2 = parseSessionKey("agent:coder:slack:dm:u123:thread:1234.567");
  console.assert(p2 !== null, "❌ 应解析成功");
  console.assert(p2!.threadId === "1234.567", `❌ threadId 期望 1234.567，得到 ${p2!.threadId}`);
  console.log(`✅ 解析带 thread key:`, p2);

  const p3 = parseSessionKey("invalid");
  console.assert(p3 === null, "❌ 无效 key 应返回 null");
  console.log(`✅ 无效 key 返回 null`);

  console.log("\n=== 练习 6.3：resolveRoute ===\n");

  const bindings: Binding[] = [
    { agentId: "coder", peerId: "12345", channel: "telegram" },
    { agentId: "discord_admin", guildId: "guild1", roleIds: ["admin", "mod"] },
    { agentId: "discord_general", guildId: "guild1" },
    { agentId: "telegram_bot", channel: "telegram" },
  ];

  // 测试 7：精确 peer 匹配
  const r7 = resolveRoute({
    channel: "telegram", kind: "dm", peerId: "12345",
    bindings, defaultAgentId: "main",
  });
  console.assert(r7.agentId === "coder", `❌ 期望 coder，得到 ${r7.agentId}`);
  console.assert(r7.matchedBy === "binding.peer", `❌ 期望 binding.peer`);
  console.log(`✅ peer 匹配: agentId=${r7.agentId}, matchedBy=${r7.matchedBy}`);

  // 测试 8：Guild + 角色匹配
  const r8 = resolveRoute({
    channel: "discord", kind: "group", peerId: "99999",
    guildId: "guild1", memberRoleIds: ["admin"],
    bindings, defaultAgentId: "main",
  });
  console.assert(r8.agentId === "discord_admin", `❌ 期望 discord_admin，得到 ${r8.agentId}`);
  console.assert(r8.matchedBy === "binding.guild+roles", `❌ 期望 binding.guild+roles`);
  console.log(`✅ guild+roles 匹配: agentId=${r8.agentId}`);

  // 测试 9：Guild 匹配（无匹配角色）
  const r9 = resolveRoute({
    channel: "discord", kind: "group", peerId: "99999",
    guildId: "guild1", memberRoleIds: ["regular"],
    bindings, defaultAgentId: "main",
  });
  console.assert(r9.agentId === "discord_general", `❌ 期望 discord_general，得到 ${r9.agentId}`);
  console.assert(r9.matchedBy === "binding.guild", `❌ 期望 binding.guild`);
  console.log(`✅ guild 匹配: agentId=${r9.agentId}`);

  // 测试 10：Channel 类型匹配
  const r10 = resolveRoute({
    channel: "telegram", kind: "dm", peerId: "99999",
    bindings, defaultAgentId: "main",
  });
  console.assert(r10.agentId === "telegram_bot", `❌ 期望 telegram_bot，得到 ${r10.agentId}`);
  console.assert(r10.matchedBy === "binding.channel", `❌ 期望 binding.channel`);
  console.log(`✅ channel 匹配: agentId=${r10.agentId}`);

  // 测试 11：无匹配，用默认
  const r11 = resolveRoute({
    channel: "whatsapp", kind: "dm", peerId: "99999",
    bindings, defaultAgentId: "main",
  });
  console.assert(r11.agentId === "main", `❌ 期望 main，得到 ${r11.agentId}`);
  console.assert(r11.matchedBy === "default", `❌ 期望 default`);
  console.log(`✅ 默认路由: agentId=${r11.agentId}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
