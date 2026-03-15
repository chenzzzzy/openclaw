# OpenClaw 架构逆向分析

这份分析基于当前仓库中的源码和文档，不是猜测。

## 1. 用一句话概括真实架构

OpenClaw 不是“一个聊天机器人”。

它是一个本地优先的 gateway：负责持有渠道连接、session 身份、tool 执行和 agent runtime 编排，并向 CLI、应用、Web 界面和设备节点暴露一套类型化的控制平面。

## 2. 核心层次以及它们为什么重要

### A. 启动与 CLI 接口层

关键文件：

- `openclaw.mjs`
- `src/entry.ts`
- `src/cli/run-main.ts`
- `src/cli/program.ts`
- `src/commands/agent.ts`
- `src/commands/agent-via-gateway.ts`

这一层负责：

- 校验运行时和启动环境
- 规范化 argv 与 profile 选择
- 把命令路由到 gateway 或本地 embedded 路径
- 让 CLI 成为主要的 operator 交互面

架构结论：

OpenClaw 把 CLI 当成一等控制面，而不是调试附属品。

### B. Gateway 控制平面

关键文件：

- `docs/concepts/architecture.md`
- `src/gateway/server.impl.ts`
- `src/gateway/server-http.ts`
- `src/gateway/server-ws-runtime.ts`
- `src/gateway/server-methods.ts`
- `src/gateway/server-channels.ts`
- `src/gateway/server-chat.ts`

这一层负责：

- 托管 WebSocket 与 HTTP 端点
- 管理已认证客户端与节点
- 持有运行时状态、channel 生命周期、事件和订阅
- 向所有 operator 界面暴露统一控制平面

架构结论：

Gateway 才是产品的真实核心。渠道、应用和工具都挂接在它上面。

### C. Agent 运行时

关键文件：

- `src/agents/pi-embedded-runner/run.ts`
- `src/agents/pi-embedded-runner/model.ts`
- `src/agents/pi-embedded-runner/system-prompt.ts`
- `src/agents/context-window-guard.ts`
- `src/agents/compaction.ts`
- `src/agents/model-fallback.ts`

这一层负责：

- 解析 provider / model / auth profile
- 构建 system prompt、skills prompt 和 tool 集合
- 执行 think -> tool -> retry / fallback -> finalize 的核心循环
- 控制上下文窗口并处理 compaction
- 记录 usage 与失败状态

架构结论：

这里是 OpenClaw 从“集成工程”变成“agent runtime”的地方。

### D. Session 身份与路由

关键文件：

- `src/routing/session-key.ts`
- `src/routing/resolve-route.ts`
- `docs/concepts/session.md`
- `src/sessions/transcript-events.ts`

这一层负责：

- 定义一条入站消息如何映射到稳定的 session key
- 隔离 DM、群组、线程、agent 和 account 维度
- 决定哪个 agent 处理哪个 channel / account / peer
- 给持久化、并发控制和重放提供稳定骨架

架构结论：

如果你只能深入重建一个东西，就应该把 session key 与 routing 重建正确。这是整套系统的脊柱。

### E. 渠道抽象层

关键文件：

- `src/channels/plugins/index.ts`
- `src/channels/plugins/types.ts`
- `src/gateway/server-channels.ts`
- `extensions/*`

这一层负责：

- 把渠道当成具备标准生命周期与配置契约的插件
- 隔离 provider 特定的登录、发送、群组和安全行为
- 让 gateway 用统一方式管理渠道

架构结论：

OpenClaw 之所以是“多渠道”，不是因为它复制了很多接入代码，而是因为它把渠道做成了可挂接的运行时单元。

### F. Tool 运行时

关键文件：

- `src/agents/tools/*.ts`
- `src/agents/bash-tools.ts`
- `src/agents/tools/web-search.ts`
- `src/agents/tools/sessions-send-tool.ts`
- `docs/tools/multi-agent-sandbox-tools.md`

这一层负责：

- 注册工具定义
- 应用 tool policy 与 sandbox / elevated 规则
- 执行诸如 exec、browser、node、memory、web、gateway 和 session 工具等高价值动作

架构结论：

Tool 层是策略驱动、并且与渠道语义相关的，它不只是“function calling”。

### G. Plugins 与 Skills

关键文件：

- `src/plugins/loader.ts`
- `src/plugins/runtime/index.ts`
- `docs/tools/plugin.md`
- `src/agents/skills/*`
- `docs/tools/skills.md`

这一层负责：

- 加载运行时扩展
- 暴露受控的 runtime helpers
- 允许插件添加渠道、工具、hooks、HTTP 路由和后台服务
- 通过 skill 目录和加载期 gating 教模型如何正确使用能力

架构结论：

OpenClaw 把“能力代码”和“agent 教学”分开。插件负责增加能力，skills 负责增加判断与使用方式。

### H. Memory 与检索

关键文件：

- `src/memory/hybrid.ts`
- `src/memory/mmr.ts`
- `src/memory/temporal-decay.ts`
- `src/memory/manager.ts`

这一层负责：

- 支持向量检索加关键词检索
- 用加权评分合并结果
- 通过 MMR 提升检索多样性
- 通过 temporal decay 引入时间新鲜度偏置

架构结论：

Memory 不是一次简单的向量库调用，而是一条检索排序流水线。

## 3. 最短且准确的运行流程

1. CLI、WebChat 或某个渠道适配器把请求送进 gateway。
2. Gateway 解析目标 agent 和 session key。
3. 加载 session 状态和 transcript 上下文。
4. 解析 skills、tools、model 配置、auth profiles 和 policy。
5. Embedded agent runtime 执行一轮 turn。
6. Tool 调用通过 gateway 事件系统流出。
7. 出错时可以轮换 auth profile，或回退到另一个 model。
8. 最终回复会被持久化，并可选择投递回原始渠道。

## 4. 你自己的重建项目里哪些部分是关键

### 必须自己重建

- session-key 策略
- route resolution
- agent turn orchestration
- provider abstraction
- tool registry 和执行契约
- transcript / session 持久化
- model fallback 逻辑

这些部分最能体现系统设计能力，也是面试官最关注的部分。

### 可以大幅简化

- 渠道数量
- control UI
- onboarding wizard
- auth UX
- packaging
- 移动端 / mac 节点
- 完整的插件市场行为

### 可以选择复用思路或局部代码

- `src/routing/session-key.ts` 中的 session key 设计思路
- `src/routing/resolve-route.ts` 中的 route precedence 思路
- `src/memory/hybrid.ts` 中的 hybrid retrieval scoring
- `src/plugins/loader.ts` 中的 plugin manifest 与 loader 思路
- `src/agents/model-fallback.ts` 中的 fallback 语义

## 5. 适合作品集的切分方式

如果你想要最高的投入产出比，个人版重建应当按下面的里程碑交付：

1. gateway 加 CLI
2. session keys 加 routing
3. embedded agent loop
4. tool execution
5. model fallback
6. 一个聊天渠道适配器
7. 轻量 plugin / skill 系统
8. 可选的 memory retrieval

做到这些，你就可以准确地说：

“我从零重建了一个类 OpenClaw 系统的核心控制平面、会话架构和工具驱动多 agent 运行时。”

这对面试表达是很强的信号。
