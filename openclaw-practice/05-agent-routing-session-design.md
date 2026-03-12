# 知识点 5：Agent 路由与 Session Key 设计

## 1. 概念解释

### 为什么 Agent 需要路由系统？

一个生产级 Agent 平台需要处理：
- 多个渠道（Telegram、Discord、Slack、iMessage...）
- 多种会话类型（DM、群组、线程）
- 多个 Agent 实例（main agent、coding agent、research agent...）
- 多租户（不同用户完全隔离）

路由系统决定：**"这条消息应该由哪个 Agent、哪个 Session 处理？"**

---

## 2. Session Key 的精妙设计

源码位置：`src/routing/session-key.ts`

### 2.1 Session Key 格式

```
agent:{agentId}:{channel}:{kind}:{peerId}[:{modifier}:{value}]

示例：
  agent:main:telegram:dm:123456789
  agent:main:discord:group:987654321
  agent:coder:slack:dm:U12345678:thread:1234567890.123456
  agent:researcher:whatsapp:group:120363123456789@g.us
```

**设计原理：**
- **层次化键**：从粗到细（agent → channel → type → peer），天然支持前缀范围查询
- **自描述**：从 key 本身就能解析出所有路由信息，无需额外查询
- **可扩展**：线程、话题等可以追加在末尾，不破坏向后兼容性

### 2.2 关键构造函数

```typescript
// src/routing/session-key.ts

// 构造 DM/私聊的主 Session Key
export function buildAgentMainSessionKey(params: {
  agentId: string;
  mainKey?: string;
}): string {
  const agentId = normalizeAgentId(params.agentId);
  const mainKey = normalizeMainKey(params.mainKey);
  return `agent:${agentId}:${mainKey}`;
}

// 构造 Peer（特定用户/群组）的 Session Key
export function buildAgentPeerSessionKey(params: {
  agentId: string;
  channel: string;
  kind: ChatType;       // "dm" | "group" | "channel"
  peerId: string;
  accountId?: string;
  threadId?: string | number;
}): string {
  const base = [
    "agent",
    normalizeAgentId(params.agentId),
    normalizeAccountId(params.accountId),  // 多租户支持
    params.channel.toLowerCase(),
    params.kind,
    params.peerId,
  ].join(":");
  
  if (params.threadId != null) {
    return `${base}:thread:${params.threadId}`;
  }
  return base;
}
```

---

## 3. Agent 路由决策逻辑

源码位置：`src/routing/resolve-route.ts`

### 3.1 路由优先级链

```typescript
export async function resolveAgentRoute(
  input: ResolveAgentRouteInput
): Promise<ResolvedAgentRoute> {
  const bindings = listBindings(input.cfg);
  
  // 优先级从高到低
  
  // 1. 精确 Peer 绑定（最高优先级）
  //    "把所有 @user123 的消息路由到 coder agent"
  const peerBinding = bindings.find(b =>
    matchesPeer(b, input.peer, input.channel)
  );
  if (peerBinding) return buildRoute(peerBinding, "binding.peer");
  
  // 2. 父 Peer 绑定（线程继承父话题的路由）
  const parentBinding = bindings.find(b =>
    matchesPeer(b, input.parentPeer, input.channel)
  );
  if (parentBinding) return buildRoute(parentBinding, "binding.peer.parent");
  
  // 3. Discord 角色绑定
  //    "Admin 角色的用户走 admin-agent"
  const roleBinding = bindings.find(b =>
    matchesGuildRoles(b, input.guildId, input.memberRoleIds)
  );
  if (roleBinding) return buildRoute(roleBinding, "binding.guild+roles");
  
  // 4. Discord Guild 绑定
  const guildBinding = bindings.find(b =>
    matchesGuild(b, input.guildId)
  );
  if (guildBinding) return buildRoute(guildBinding, "binding.guild");
  
  // 5. Teams 绑定
  const teamBinding = bindings.find(b =>
    matchesTeam(b, input.teamId)
  );
  if (teamBinding) return buildRoute(teamBinding, "binding.team");
  
  // 6. Account 绑定（多租户隔离）
  const accountBinding = bindings.find(b =>
    matchesAccount(b, input.accountId)
  );
  if (accountBinding) return buildRoute(accountBinding, "binding.account");
  
  // 7. Channel 类型绑定（"所有 Telegram 消息走 telegram-agent"）
  const channelBinding = bindings.find(b =>
    matchesChannel(b, input.channel)
  );
  if (channelBinding) return buildRoute(channelBinding, "binding.channel");
  
  // 8. 默认 Agent（兜底）
  const defaultAgentId = resolveDefaultAgentId(input.cfg);
  return buildDefaultRoute(defaultAgentId, input);
}
```

### 3.2 lastRoutePolicy 设计

```typescript
// 决定"last route"（上一次路由记录）存储到哪个 Session Key
export function deriveLastRoutePolicy(params: {
  sessionKey: string;
  mainSessionKey: string;
}): "main" | "session" {
  // 如果 sessionKey == mainSessionKey，说明这是直接对话，存到 main
  // 如果不同（如线程 session），存到 main（避免频繁更新线程 session）
  return params.sessionKey === params.mainSessionKey ? "main" : "session";
}
```

**用途：** Agent 主动发消息时（如定时任务），需要知道"上次和这个用户的对话在哪个 session"，`lastRoute` 记录了这个信息。

---

## 4. 会话隔离与并发控制

每个 Session Key 对应一个独立的会话锁，防止同一用户同时触发多个 Agent 请求：

```
用户快速发送两条消息：
  Message 1: "帮我写代码" → 尝试获取 session lock
  Message 2: "不对，重新来" → 等待 session lock
  
  Agent 处理完 Message 1 后释放锁
  Agent 开始处理 Message 2（此时可能已获得新的 context）
```

---

## 5. 面试关键问答

**Q: 如何设计一个支持多渠道、多 Agent 的路由系统？**

A: 关键在 Session Key 的设计——采用层次化键格式（`agent:agentId:channel:kind:peerId`），实现：①自描述（从 key 解析路由信息无需额外查询）；②天然隔离（不同用户/渠道/Agent 的历史完全分离）；③前缀可扩展（支持线程等子会话）。路由决策采用优先级链：精确 peer > 角色 > 群组 > 渠道类型 > 默认兜底，每一层都有明确的匹配规则。

**Q: 多渠道 Agent 如何防止会话串扰（Cross-session Contamination）？**

A: 通过 Session Key 的结构化设计，渠道名和用户 ID 都编码在 key 中，存储时完全隔离。同时用乐观锁/互斥锁防止同一 Session 的并发写入。

---

## 练习题

→ [exercises/ex06-agent-routing.ts](./exercises/ex06-agent-routing.ts)

→ 标准答案：[answers/ans06-agent-routing.ts](./answers/ans06-agent-routing.ts)
