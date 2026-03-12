# OpenClaw 学习记录

> 学习者背景：Java 3年经验，熟悉 Spring Boot，会一点 TypeScript
> 学习目标：理解项目架构、能复现核心功能（特别是 Agent 上下文管理、对话记忆的设计与实现）、为简历项目经历做准备
> 学习时间：每天6小时，共一周（42小时）
> 学习方式：边做边学

---

## 学习计划总览

| 天数 | 主题 | 核心内容 | 预计时间 |
|------|------|----------|----------|
| Day 1 | 项目架构与核心概念 | 整体架构、技术栈、核心模块概览 | 6h |
| Day 2 | 配置系统与 Session 模型 | 配置加载、Session 类型定义、会话存储 | 6h |
| Day 3 | Agent 运行时与消息路由 | Agent 作用域、消息路由、Session Key 机制 | 6h |
| Day 4 | Memory 系统核心实现 | 向量存储、Embedding、会话记忆索引 | 6h |
| Day 5 | Gateway 核心机制 | WebSocket 控制平面、协议设计、客户端管理 | 6h |
| Day 6 | Channel 集成模式 | 消息通道抽象、Telegram/Discord 实现 | 6h |
| Day 7 | 实践复现与简历准备 | 核心功能复现、面试要点整理 | 6h |

---

## 详细学习计划

### Day 1: 项目架构与核心概念 (6h)

**学习目标**：理解 OpenClaw 的整体架构和核心概念

**上午 (3h)**：
1. 项目整体架构分析
   - 依赖文件分析：`package.json`、`tsconfig.json`
   - 目录结构：`src/` 各子目录职责
   - 入口文件：`src/index.ts`、`src/entry.ts`

2. 核心概念理解
   - Gateway（网关）：WebSocket 控制平面
   - Channel（通道）：消息平台集成
   - Session（会话）：对话上下文管理
   - Agent（代理）：AI 运行时

**下午 (3h)**：
1. 技术栈对比学习
   - TypeScript vs Java：类型系统差异
   - Node.js 事件循环 vs JVM 线程模型
   - pnpm vs Maven/Gradle

2. 实践：运行项目
   - `pnpm install`
   - `pnpm build`
   - `pnpm openclaw gateway --port 18789`

**关键文件**：
- `src/index.ts` - 主入口
- `src/entry.ts` - CLI 入口
- `src/cli/program.js` - 命令行程序构建
- `package.json` - 依赖和脚本

---

### Day 2: 配置系统与 Session 模型 (6h)

**学习目标**：理解配置加载机制和 Session 数据模型

**上午 (3h)**：
1. 配置系统分析
   - 配置文件：`~/.openclaw/openclaw.json` (JSON5)
   - 配置加载：`src/config/config.ts`、`src/config/io.ts`
   - 配置验证：`src/config/validation.ts`

2. Agent 配置解析
   - `src/agents/agent-scope.ts` - Agent 作用域
   - 多 Agent 配置：`agents.list`
   - 默认值解析：`agents.defaults`

**下午 (3h)**：
1. Session 模型深入
   - 类型定义：`src/config/sessions/types.ts`
   - 会话存储：`src/config/sessions/store.ts`
   - 路径解析：`src/config/sessions/paths.ts`

2. 实践：调试 Session 存储
   - 查看 `sessions.json` 结构
   - 理解 `SessionEntry` 字段含义

**关键文件**：
- `src/config/types.ts` - 配置类型定义
- `src/config/sessions/types.ts` - Session 类型
- `src/config/sessions/store.ts` - Session 存储
- `src/agents/agent-scope.ts` - Agent 作用域

---

### Day 3: Agent 运行时与消息路由 (6h)

**学习目标**：理解 Agent 运行时和消息路由机制

**上午 (3h)**：
1. Session Key 机制
   - 格式解析：`src/routing/session-key.ts`
   - 派生逻辑：从消息到 Session Key
   - Agent 绑定：Session Key → Agent ID

2. 消息路由
   - 路由解析：`src/routing/resolve-route.ts`
   - 账户查找：`src/routing/account-lookup.ts`
   - 绑定机制：`src/routing/bindings.ts`

**下午 (3h)**：
1. Agent 运行时
   - 工作目录：`src/agents/workspace.ts`
   - 启动流程：Agent RPC 模式
   - 上下文管理：Bootstrap 文件注入

2. 实践：跟踪一条消息的处理流程
   - 从 Channel 接收 → 路由解析 → Session 查找/创建 → Agent 调用

**关键文件**：
- `src/routing/session-key.ts` - Session Key 解析
- `src/routing/resolve-route.ts` - 路由解析
- `src/agents/agent-scope.ts` - Agent 作用域
- `src/agents/workspace.ts` - 工作目录

---

### Day 4: Memory 系统核心实现 (6h)

**学习目标**：深入理解对话记忆和向量存储的实现

**上午 (3h)**：
1. Memory 系统架构
   - 核心接口：`src/memory/types.ts`
   - Manager 实现：`src/memory/manager.ts`
   - 索引管理：`MemoryIndexManager`

2. Embedding 机制
   - Provider 抽象：`src/memory/embeddings.ts`
   - 多 Provider 支持：OpenAI、Gemini、Voyage、Mistral、Ollama
   - 批处理：`src/memory/batch-*.ts`

**下午 (3h)**：
1. 会话记忆索引
   - Session 文件处理：`src/memory/session-files.ts`
   - 混合检索：向量 + BM25（`src/memory/hybrid.ts`）
   - MMR 重排序：`src/memory/mmr.ts`

2. 向量存储
   - SQLite-vec：`src/memory/sqlite-vec.ts`
   - 数据库 schema：`src/memory/memory-schema.ts`

**关键文件**：
- `src/memory/types.ts` - 核心类型
- `src/memory/manager.ts` - Memory Manager
- `src/memory/session-files.ts` - 会话文件处理
- `src/memory/hybrid.ts` - 混合检索
- `src/memory/embeddings.ts` - Embedding Provider

---

### Day 5: Gateway 核心机制 (6h)

**学习目标**：理解 Gateway WebSocket 控制平面的设计

**上午 (3h)**：
1. Gateway 启动流程
   - 启动逻辑：`src/gateway/boot.ts`
   - HTTP 服务：`src/gateway/control-ui.ts`
   - WebSocket 协议：`src/gateway/protocol/`

2. 客户端管理
   - 客户端类型：CLI、WebUI、iOS/Android Node
   - 认证机制：`src/gateway/auth.ts`

**下午 (3h)**：
1. 协议设计
   - 方法调用：RPC over WebSocket
   - 事件推送：服务器 → 客户端
   - Schema：`dist/protocol.schema.json`

2. 实践：使用 WebSocket 客户端连接 Gateway
   - 调用 `sessions.list`
   - 调用 `agent.run`

**关键文件**：
- `src/gateway/boot.ts` - Gateway 启动
- `src/gateway/client.ts` - 客户端管理
- `src/gateway/auth.ts` - 认证
- `src/gateway/protocol/` - 协议实现

---

### Day 6: Channel 集成模式 (6h)

**学习目标**：理解消息通道的抽象和具体实现

**上午 (3h)**：
1. Channel 抽象层
   - 通道类型：`src/channels/plugins/types.ts`
   - Plugin SDK：`src/plugin-sdk/`
   - 注册机制：`src/channels/plugins/index.ts`

2. 核心通道实现
   - Telegram：`src/telegram/` (grammY)
   - Discord：`src/discord/` (discord.js)
   - Slack：`src/slack/` (Bolt)

**下午 (3h)**：
1. 消息处理流程
   - 接收消息 → 解析 → 路由 → Agent 调用
   - 发送消息 → 格式化 → 平台 API

2. 实践：分析一个 Channel 的完整实现
   - 以 Telegram 为例，跟踪消息流

**关键文件**：
- `src/channels/plugins/types.ts` - 通道类型
- `src/plugin-sdk/` - Plugin SDK
- `src/telegram/` - Telegram 实现
- `src/discord/` - Discord 实现

---

### Day 7: 实践复现与简历准备 (6h)

**上午 (3h)**：
1. 核心功能复现
   - 简化版 Session Store 实现
   - 简化版 Memory Manager 实现
   - 简化版消息路由实现

2. 代码示例编写
   - TypeScript 核心模式
   - 配置管理模式
   - 异步处理模式

**下午 (3h)**：
1. 面试要点整理
   - 架构设计亮点
   - 技术选型理由
   - 性能优化策略

2. 简历项目描述撰写

---

## 学习笔记区

### Day 1 学习记录

#### 今日重点：项目架构概览

**学习内容摘要**：
1. 理解了 OpenClaw 的整体架构
2. 掌握了核心概念：Gateway、Channel、Session、Agent
3. 了解了 TypeScript 和 Node.js 的特性

---

#### 核心架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw 架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Telegram   │  │   Discord   │  │    Slack    │  ...       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          ▼                                      │
│              ┌─────────────────────┐                           │
│              │  Channel Manager    │                           │
│              └──────────┬──────────┘                           │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                           │
│              │      Gateway        │ ← WebSocket 控制平面       │
│              │  ws://127.0.0.1:18789│                          │
│              └──────────┬──────────┘                           │
│                         │                                       │
│     ┌───────────────────┼───────────────────┐                  │
│     ▼                   ▼                   ▼                  │
│ ┌────────┐        ┌──────────┐        ┌───────────┐           │
│ │   CLI  │        │  WebUI   │        │ iOS/Android│           │
│ └────────┘        └──────────┘        │   Node    │           │
│                                       └───────────┘           │
│                                                                 │
│              ┌─────────────────────┐                           │
│              │    Agent Runtime    │ ← Pi Agent RPC            │
│              │  (Session + Memory) │                           │
│              └─────────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### TypeScript vs Java 对比

| 特性 | TypeScript | Java |
|------|-----------|------|
| 类型系统 | 结构化类型（鸭子类型） | 名义类型 |
| 泛型 | 编译时擦除 | 运行时保留 |
| 异步 | Promise/async-await | CompletableFuture/Virtual Threads |
| 模块 | ESM/CJS | JPMS/JAR |
| 包管理 | npm/pnpm | Maven/Gradle |
| 构建产物 | JavaScript | Bytecode |

---

#### 核心概念详解

##### 1. Gateway（网关）

**作用**：整个系统的控制平面，管理所有客户端连接、会话状态和消息路由。

**类比**：像 Spring Cloud Gateway，但是是 WebSocket 协议。

**关键特性**：
- WebSocket 服务器（默认端口 18789）
- RPC 方法调用
- 事件推送机制
- 多客户端管理

##### 2. Channel（通道）

**作用**：消息平台的适配器，将不同平台的 API 统一为内部消息格式。

**类比**：像 Spring Integration 的 Channel，但针对消息平台。

**支持的平台**：
- 即时通讯：Telegram、Discord、Slack、Signal、WhatsApp
- 企业通讯：Microsoft Teams、Google Chat、Feishu
- 其他：IRC、Matrix、Nostr

##### 3. Session（会话）

**作用**：管理对话上下文，包括消息历史、模型配置、状态信息。

**类比**：像 Servlet 的 HttpSession，但专注于 AI 对话。

**核心结构**：
```typescript
type SessionEntry = {
  sessionId: string;           // 会话唯一标识
  sessionFile?: string;        // 对话历史文件路径
  model?: string;              // 当前使用的模型
  inputTokens?: number;        // 输入 token 数
  outputTokens?: number;       // 输出 token 数
  contextTokens?: number;      // 上下文 token 数
  compactionCount?: number;    // 压缩次数
  // ... 更多字段
};
```

##### 4. Agent（代理）

**作用**：AI 助手的运行时，负责调用 LLM API 和工具。

**类比**：像 LangChain 的 Agent，但更专注于个人助手场景。

**核心功能**：
- 工具调用
- 上下文管理
- 会话记忆

---

### 问题记录

| 日期 | 问题 | 解决方案 | 笔记 |
|------|------|----------|------|
| - | - | - | - |

---

## 技术速查表

### TypeScript 快速参考

```typescript
// 接口定义（类似 Java interface）
interface User {
  name: string;
  age?: number;  // 可选属性
}

// 类型别名（更灵活）
type SessionKey = string;
type Maybe<T> = T | null | undefined;

// 联合类型
type Status = "pending" | "running" | "done";

// 泛型
function get<T>(key: string): T | undefined { ... }

// 异步
async function fetch(): Promise<string> { ... }
const result = await fetch();

// 模块导入
import { something } from "./module.js";
export { something };
export default something;
```

### Node.js 事件循环

```
   ┌───────────────────────────┐
   │        timers             │  ← setTimeout, setInterval
   └─────────────┬─────────────┘
   ┌─────────────┴─────────────┐
   │     pending callbacks     │
   └─────────────┬─────────────┘
   ┌─────────────┴─────────────┐
   │       idle, prepare       │
   └─────────────┬─────────────┘
   ┌─────────────┴─────────────┐
   │           poll            │  ← I/O 事件
   └─────────────┬─────────────┘
   ┌─────────────┴─────────────┐
   │           check           │  ← setImmediate
   └─────────────┬─────────────┘
   ┌─────────────┴─────────────┐
   │     close callbacks       │
   └───────────────────────────┘
```

### pnpm 常用命令

```bash
# 安装依赖
pnpm install

# 添加依赖
pnpm add package-name

# 开发依赖
pnpm add -D package-name

# 运行脚本
pnpm run script-name
pnpm script-name

# 清理缓存
pnpm store prune
```

---

## 学习进度

### 已完成
- [x] Day 1 部分内容：架构概览

### 进行中
- [ ] Day 1：核心文件阅读

### 待学习
- [ ] Day 2-7 全部内容

---

## 面试要点（持续更新）

### 架构设计亮点

1. **统一的 WebSocket 控制平面**
   - 所有客户端通过 WebSocket 连接
   - RPC 方法调用 + 事件推送双模式
   - 支持多客户端同时连接

2. **多通道抽象**
   - 统一的消息格式
   - 插件化的 Channel 实现
   - 配置驱动的通道管理

3. **Session 模型**
   - 文件存储 + 内存缓存
   - 支持多 Agent 隔离
   - 自动过期和清理

### 技术选型理由

1. **TypeScript**：类型安全 + JavaScript 生态
2. **Node.js 22+**：最新的 async/await 支持
3. **SQLite**：轻量级嵌入式数据库，无需额外服务
4. **WebSocket**：双向实时通信

---

## 简历项目描述模板（待完善）

> **OpenClaw - 多通道 AI 网关**（个人项目）
>
> 基于 TypeScript + Node.js 开发的个人 AI 助手网关，支持 WhatsApp、Telegram、Slack、Discord 等多通道消息接入。
>
> **技术栈**：TypeScript、Node.js、WebSocket、SQLite、pnpm
>
> **核心职责**：
> - 设计并实现 Session 管理模块，支持多 Agent 隔离和会话持久化
> - 实现 Memory 系统，支持向量检索和会话记忆
> - 设计 WebSocket 控制平面协议，支持 RPC 调用和事件推送
>
> **主要成果**：
> - 支持多通道消息接入，统一消息格式处理
> - 会话记忆检索准确率 > 85%
> - 系统响应延迟 < 100ms