# 从练习到实现的映射表

这份文件把现有的 `openclaw-practice` 学习路线映射到新的 Mini OpenClaw 实施计划。

## 核心映射

- `01-context-window-management.md`
  - 新项目中的目标：上下文预算与 prompt guard
  - 实施阶段：阶段 4 和阶段 8

- `02-conversation-history-truncation.md`
  - 新项目中的目标：transcript 裁剪与 compaction 触发
  - 实施阶段：阶段 4 和阶段 8

- `03-rag-hybrid-search.md`
  - 新项目中的目标：hybrid memory retrieval
  - 实施阶段：阶段 8

- `04-tool-function-calling.md`
  - 新项目中的目标：tool registry 与 tool-call loop
  - 实施阶段：阶段 4 和阶段 6

- `05-agent-routing-session-design.md`
  - 新项目中的目标：binding rules、route resolution、session key 策略
  - 实施阶段：阶段 2

- `06-auth-failover-multi-provider.md`
  - 新项目中的目标：provider adapter 加 fallback / cooldown policy
  - 实施阶段：阶段 5

- `07-conversation-compaction.md`
  - 新项目中的目标：summary compaction 与上下文滚动
  - 实施阶段：阶段 8

- `08-prompt-caching.md`
  - 新项目中的目标：provider-aware prompt caching hooks
  - 实施阶段：阶段 5 之后，可选优化

- `09-multi-agent-orchestration.md`
  - 新项目中的目标：跨 session handoff、spawned runs、delegated tools
  - 实施阶段：单 agent 核心稳定之后

- `10-plugin-skill-architecture.md`
  - 新项目中的目标：plugin manifests、runtime registration、skill injection
  - 实施阶段：阶段 9

## 建议顺序

按这个顺序构建：

1. session routing
2. gateway protocol
3. agent turn loop
4. tools
5. provider fallback
6. memory and compaction
7. multi-agent 和 plugins

这个顺序同时贴合上游架构，也最适合面试表达。
