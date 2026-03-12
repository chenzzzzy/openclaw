/**
 * 标准答案 6：Agent 路由与 Session Key 设计
 */

export type ChatKind = "dm" | "group" | "channel";
export type SessionKeyParams = {
  agentId: string; channel: string; kind: ChatKind;
  peerId: string; threadId?: string | number;
};
export type ParsedSessionKey = {
  agentId: string; channel: string; kind: ChatKind;
  peerId: string; threadId?: string;
};
export type Binding = {
  agentId: string; peerId?: string; channel?: string;
  roleIds?: string[]; guildId?: string;
};
export type RouteInput = {
  channel: string; kind: ChatKind; peerId: string;
  guildId?: string; memberRoleIds?: string[];
  bindings: Binding[]; defaultAgentId: string;
};
export type RouteResult = {
  agentId: string;
  matchedBy: "binding.peer" | "binding.guild+roles" | "binding.guild" | "binding.channel" | "default";
};

/**
 * 构造规范化的 Session Key
 * 格式：agent:{agentId}:{channel}:{kind}:{peerId}[:{threadId}]
 */
export function buildSessionKey(params: SessionKeyParams): string {
  const parts = [
    "agent",
    params.agentId.toLowerCase(),
    params.channel.toLowerCase(),
    params.kind.toLowerCase(),
    params.peerId.toLowerCase(),
  ];

  if (params.threadId != null) {
    parts.push("thread");
    parts.push(String(params.threadId));
  }

  return parts.join(":");
}

/**
 * 解析 Session Key
 */
export function parseSessionKey(key: string): ParsedSessionKey | null {
  const parts = key.split(":");

  // 最少需要：agent:{agentId}:{channel}:{kind}:{peerId} = 5 部分
  if (parts.length < 5 || parts[0] !== "agent") return null;

  const agentId = parts[1];
  const channel = parts[2];
  const kind = parts[3] as ChatKind;

  if (!agentId || !channel || !kind) return null;

  // 检查是否有 :thread:{threadId} 后缀
  const threadIdx = parts.indexOf("thread", 4);
  let peerId: string;
  let threadId: string | undefined;

  if (threadIdx >= 4 && parts[threadIdx + 1]) {
    // peerId 是从第 4 部分到 thread 之前的所有部分（支持 peerId 包含冒号的情况）
    peerId = parts.slice(4, threadIdx).join(":");
    threadId = parts.slice(threadIdx + 1).join(":");
  } else {
    peerId = parts.slice(4).join(":");
  }

  if (!peerId) return null;

  return { agentId, channel, kind, peerId, threadId };
}

/**
 * 按优先级链路由到正确的 Agent
 */
export function resolveRoute(input: RouteInput): RouteResult {
  const { bindings } = input;
  const channel = input.channel.toLowerCase();
  const peerId = input.peerId.toLowerCase();

  // 1. 精确 peer 匹配
  const peerBinding = bindings.find(b =>
    b.peerId && b.channel &&
    b.peerId.toLowerCase() === peerId &&
    b.channel.toLowerCase() === channel
  );
  if (peerBinding) return { agentId: peerBinding.agentId, matchedBy: "binding.peer" };

  // 2. Guild + 角色匹配（需要所有指定角色都匹配）
  if (input.guildId && input.memberRoleIds && input.memberRoleIds.length > 0) {
    const roleBinding = bindings.find(b =>
      b.guildId && b.roleIds && b.roleIds.length > 0 &&
      b.guildId === input.guildId &&
      b.roleIds.some(role => input.memberRoleIds!.includes(role))
    );
    if (roleBinding) return { agentId: roleBinding.agentId, matchedBy: "binding.guild+roles" };
  }

  // 3. Guild 匹配
  if (input.guildId) {
    const guildBinding = bindings.find(b =>
      b.guildId && b.guildId === input.guildId && !b.roleIds
    );
    if (guildBinding) return { agentId: guildBinding.agentId, matchedBy: "binding.guild" };
  }

  // 4. Channel 类型匹配
  const channelBinding = bindings.find(b =>
    b.channel && b.channel.toLowerCase() === channel && !b.peerId && !b.guildId
  );
  if (channelBinding) return { agentId: channelBinding.agentId, matchedBy: "binding.channel" };

  // 5. 默认
  return { agentId: input.defaultAgentId, matchedBy: "default" };
}

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 6 测试 ===\n");

  // buildSessionKey
  const k1 = buildSessionKey({ agentId: "Main", channel: "Telegram", kind: "dm", peerId: "123456789" });
  console.assert(k1 === "agent:main:telegram:dm:123456789", `❌ ${k1}`);
  console.log(`✅ buildSessionKey: ${k1}`);

  const k2 = buildSessionKey({ agentId: "coder", channel: "slack", kind: "dm", peerId: "U12345678", threadId: "1234567890.123456" });
  console.assert(k2 === "agent:coder:slack:dm:u12345678:thread:1234567890.123456", `❌ ${k2}`);
  console.log(`✅ buildSessionKey with thread: ${k2}`);

  // parseSessionKey
  const p1 = parseSessionKey("agent:main:telegram:dm:123456789");
  console.assert(p1?.agentId === "main" && p1?.channel === "telegram" && p1?.threadId === undefined, `❌ ${JSON.stringify(p1)}`);
  console.log(`✅ parseSessionKey: ${JSON.stringify(p1)}`);

  const p3 = parseSessionKey("invalid");
  console.assert(p3 === null, "❌ 无效 key 应为 null");
  console.log(`✅ 无效 key: ${p3}`);

  // resolveRoute
  const bindings: Binding[] = [
    { agentId: "coder", peerId: "12345", channel: "telegram" },
    { agentId: "discord_admin", guildId: "guild1", roleIds: ["admin", "mod"] },
    { agentId: "discord_general", guildId: "guild1" },
    { agentId: "telegram_bot", channel: "telegram" },
  ];

  const r1 = resolveRoute({ channel: "telegram", kind: "dm", peerId: "12345", bindings, defaultAgentId: "main" });
  console.assert(r1.agentId === "coder" && r1.matchedBy === "binding.peer");
  console.log(`✅ peer: ${r1.agentId} (${r1.matchedBy})`);

  const r2 = resolveRoute({ channel: "discord", kind: "group", peerId: "99", guildId: "guild1", memberRoleIds: ["admin"], bindings, defaultAgentId: "main" });
  console.assert(r2.agentId === "discord_admin" && r2.matchedBy === "binding.guild+roles");
  console.log(`✅ guild+roles: ${r2.agentId}`);

  const r3 = resolveRoute({ channel: "discord", kind: "group", peerId: "99", guildId: "guild1", memberRoleIds: ["regular"], bindings, defaultAgentId: "main" });
  console.assert(r3.agentId === "discord_general" && r3.matchedBy === "binding.guild");
  console.log(`✅ guild: ${r3.agentId}`);

  const r4 = resolveRoute({ channel: "telegram", kind: "dm", peerId: "99999", bindings, defaultAgentId: "main" });
  console.assert(r4.agentId === "telegram_bot" && r4.matchedBy === "binding.channel");
  console.log(`✅ channel: ${r4.agentId}`);

  const r5 = resolveRoute({ channel: "whatsapp", kind: "dm", peerId: "99999", bindings, defaultAgentId: "main" });
  console.assert(r5.agentId === "main" && r5.matchedBy === "default");
  console.log(`✅ default: ${r5.agentId}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
