# Mini OpenClaw 路线图

## 阶段 0 - 架构冻结

目标：

- 在开始大规模编码之前，先冻结精简后的架构边界

交付物：

- 领域术语表
- 模块边界
- 事件与请求类型
- session key 规则

## 阶段 1 - 仓库初始化

目标：

- 建立一个干净、独立的项目骨架

交付物：

- 包管理器选择
- lint / test / typecheck
- `src/` 目录布局
- 配置加载器

建议的目录布局：

- `src/core`
- `src/gateway`
- `src/agent`
- `src/providers`
- `src/tools`
- `src/channels`
- `src/plugins`
- `src/memory`
- `src/store`

## 阶段 2 - Session 与路由核心

目标：

- 让每一条入站事件都能被确定性地解析到一个 agent 和一个 session

交付物：

- session key builder / parser
- route matcher
- binding 配置
- session metadata store

验收标准：

- DM、群聊和线程路径都能生成稳定的 session key
- route precedence 有单元测试覆盖

## 阶段 3 - Gateway 控制平面

目标：

- 建立所有交互界面共享的中心运行时边界

交付物：

- WebSocket 服务
- 类型化请求 / 响应协议
- 事件广播器
- client registry

验收标准：

- 本地 CLI client 可以连接 gateway，发送 `agent.run` 请求，并接收流式事件

## 阶段 4 - Agent turn engine

目标：

- 实现一套质量合格的单轮执行循环

交付物：

- prompt builder
- message history loader
- tool call loop
- usage reporting
- transcript writer

验收标准：

- 单次 turn 至少能执行一次 tool call，并产出最终回复

## 阶段 5 - Provider 抽象与故障回退

目标：

- 把模型调用与 agent orchestration 分离开

交付物：

- provider adapter interface
- auth / profile store
- fallback chain
- retry 与 cooldown 状态管理

验收标准：

- provider A 失败后，可以带着结构化原因回退到 provider B 或 model B

## 阶段 6 - Tool 运行时

目标：

- 支持带清晰策略边界的真实动作执行

初始工具集：

- `read_file`
- `write_file`
- `shell`
- `web_search`
- `memory_search`
- `sessions_list`
- `sessions_send`

验收标准：

- 每个工具都具备 schema、runtime、result type 和 audit logging

## 阶段 7 - 渠道适配器

目标：

- 证明这套架构不仅能在 CLI 中工作

推荐的第一个适配器：

- Telegram 或 WebChat

验收标准：

- 入站消息 -> route -> agent -> 出站回复 能够端到端跑通

## 阶段 8 - Memory 与压缩

目标：

- 让长会话仍然可用

交付物：

- 简单的 retrieval interface
- transcript chunking
- summary compaction
- 可选的向量加关键词混合排序

验收标准：

- 长 session 在不丢失关键状态的前提下保持在上下文限制内

## 阶段 9 - Plugins 与 Skills

目标：

- 在不做成巨大单体的前提下证明可扩展性

交付物：

- plugin manifest
- tools 或 channels 的 runtime registration
- skill directory loader
- skill prompt injection

验收标准：

- 一个插件可以在不修改 core 文件的前提下注册一个新 tool 或 channel

## 哪些东西不要早做

不要一开始就做：

- 10+ 个渠道
- 桌面 / 移动节点
- 可视化 canvas
- 远程部署
- 复杂 operator UI
- 发布自动化

这些都是规模特性，不是证明你理解核心设计的特性。

## 简历表述建议

更适合作品集的表达方式是：

- 构建了一个本地优先的多 agent gateway
- 设计了跨渠道的确定性 session 路由
- 实现了带 model fallback 的工具驱动 LLM runtime
- 增加了可插拔的 channels、tools 和 skills
- 为长会话实现了 memory retrieval 与 transcript compaction
