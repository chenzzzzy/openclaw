# OpenClaw AI Agent 面试准备学习材料

> 基于 OpenClaw 真实生产代码，系统学习 AI Agent 工程核心能力

## 🎯 适用场景

准备以下方向的技术面试：
- AI Agent / LLM 应用工程师
- 大模型平台/基础设施工程师
- Conversational AI / Chatbot 工程师
- AI 产品全栈工程师

---

## 📚 学习路线（10 大核心知识点）

| # | 主题 | 对应源码 | 面试价值 |
|---|------|---------|---------|
| 1 | [上下文窗口管理与 Token 预算](./01-context-window-management.md) | `src/agents/context-window-guard.ts` | ⭐⭐⭐⭐⭐ |
| 2 | [对话历史截断策略](./02-conversation-history-truncation.md) | `src/agents/pi-embedded-runner/history.ts` | ⭐⭐⭐⭐⭐ |
| 3 | [RAG 混合检索（向量 + BM25 + MMR + 时间衰减）](./03-rag-hybrid-search.md) | `src/memory/` | ⭐⭐⭐⭐⭐ |
| 4 | [工具调用（Function Calling）执行管线](./04-tool-function-calling.md) | `src/agents/tools/`, `src/agents/openclaw-tools.ts` | ⭐⭐⭐⭐⭐ |
| 5 | [Agent 路由与 Session Key 设计](./05-agent-routing-session-design.md) | `src/routing/` | ⭐⭐⭐⭐ |
| 6 | [Auth Profile 故障转移与多 Provider 支持](./06-auth-failover-multi-provider.md) | `src/agents/auth-profiles/` | ⭐⭐⭐⭐ |
| 7 | [对话压缩（Context Compaction）](./07-conversation-compaction.md) | `src/agents/compaction.ts` | ⭐⭐⭐⭐⭐ |
| 8 | [提示词缓存（Prompt Caching）策略](./08-prompt-caching.md) | `src/agents/bootstrap-cache.ts` | ⭐⭐⭐⭐ |
| 9 | [多 Agent 编排（Subagent Spawning）](./09-multi-agent-orchestration.md) | `src/agents/acp-spawn.ts`, `src/agents/subagent-spawn.ts` | ⭐⭐⭐⭐⭐ |
| 10 | [插件/技能扩展架构（Plugin System）](./10-plugin-skill-architecture.md) | `src/plugins/`, `skills/` | ⭐⭐⭐ |

---

## 🏋️ 练习题目录

每个知识点包含 1~2 道练习题，并提供标准答案：

| 练习文件 | 对应知识点 | 难度 |
|---------|-----------|------|
| [exercises/ex01-context-window.ts](./exercises/ex01-context-window.ts) | 上下文窗口管理 | 中等 |
| [exercises/ex02-history-truncation.ts](./exercises/ex02-history-truncation.ts) | 历史截断 | 中等 |
| [exercises/ex03-rag-mmr.ts](./exercises/ex03-rag-mmr.ts) | MMR 重排序 | 较难 |
| [exercises/ex04-hybrid-search.ts](./exercises/ex04-hybrid-search.ts) | 混合检索融合 | 较难 |
| [exercises/ex05-tool-pipeline.ts](./exercises/ex05-tool-pipeline.ts) | 工具调用管线 | 中等 |
| [exercises/ex06-agent-routing.ts](./exercises/ex06-agent-routing.ts) | Agent 路由 | 中等 |
| [exercises/ex07-compaction.ts](./exercises/ex07-compaction.ts) | 对话压缩 | 较难 |
| [exercises/ex08-failover.ts](./exercises/ex08-failover.ts) | 故障转移 | 较难 |
| [exercises/ex09-multi-agent.ts](./exercises/ex09-multi-agent.ts) | 多 Agent 编排 | 较难 |

**标准答案：** [answers/](./answers/) 目录

---

## 📝 简历技能话术（直接可用）

详见 [resume-skills.md](./resume-skills.md)

---

## 🚀 快速上手

```bash
# 1. 阅读某个知识点的理论文档
cat openclaw-practice/01-context-window-management.md

# 2. 尝试对应的练习题
# 编辑 openclaw-practice/exercises/ex01-context-window.ts

# 3. 对照标准答案
cat openclaw-practice/answers/ans01-context-window.ts

# 4. 结合源码加深理解
cat src/agents/context-window-guard.ts
```

---

## 💡 学习建议

1. **先读理论文档** → 理解设计原理和架构决策
2. **不看答案独立做题** → 强化记忆和理解
3. **对照源码** → 理解生产代码的完整实现细节
4. **整理成自己的话** → 面试中用自己的语言流畅表达
5. **关联实际项目** → 将这些技能迁移到自己的经历中
