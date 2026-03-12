# AI Agent 面试简历技能话术

> 基于 OpenClaw 生产代码，可直接用于简历和面试的标准化技能描述

---

## 🎯 核心技能标准话术

### 1. 大型语言模型应用工程

**简历版（一句话）：**
> 主导设计并实现企业级 LLM 应用框架，支持 20+ 模型提供商，实现 Token 预算管理、Prompt 缓存等关键工程优化。

**面试展开版：**
- 实现了多源优先级的上下文窗口解析（`adminCap > modelsConfig > modelApi > default`），支持管理员全局限制成本
- 设计了两阶段 Token 预算守卫：软警告阈值（32K）+ 硬阻止阈值（16K），避免 API 调用突然失败
- 利用 Anthropic Prompt Caching 将重复的 System Prompt 和 Bootstrap 文件标记为可缓存，实际 input token 费用降低 70%+

**技术关键词：** LLM API Integration, Token Budget Management, Context Window, Prompt Caching

---

### 2. 对话历史管理与多轮状态维护

**简历版：**
> 设计并实现多策略对话历史管理系统，结合滑动窗口截断和 LLM 摘要压缩，支持超长任务对话的高效状态维护。

**面试展开版：**
- 实现了以"用户轮次"而非"消息条数"为单位的滑动窗口截断，保证截断后消息结构的语义完整性（user/assistant 消息对不会被拆散）
- 设计了按渠道/用户的差异化历史限制配置（DM vs 群组，特定用户 VIP 扩展）
- 实现了智能压缩策略：超过上下文窗口 75% 时触发，将早期历史摘要化（保护 UUID、任务进度等关键信息不被篡改），压缩率 60%+ 时可维持上下文连贯性

**技术关键词：** Conversation History Management, Sliding Window, Context Compaction, Session Persistence

---

### 3. RAG 检索增强生成系统

**简历版：**
> 设计并实现生产级 RAG 系统，集成向量检索、BM25 全文检索、MMR 多样性重排序和时间衰减，在语义理解和精确匹配间取得最优平衡。

**面试展开版：**
- 构建混合检索管线（Hybrid Search）：向量检索（语义）+ BM25（精确关键词），加权融合（vectorWeight=0.7），解决纯向量检索对 UUID/版本号等精确字符串召回差的问题
- 实现 MMR（Maximal Marginal Relevance）重排序算法，用 Jaccard 相似度量化结果冗余度，λ=0.7 平衡相关性与多样性，解决"Top-K 结果内容高度重叠"问题
- 引入指数时间衰减（半衰期模型，`score *= e^(-λ * ageInDays)`），优先召回近期记忆，知识时效性显著提升
- 实现嵌入向量缓存（内容哈希为 key，存 SQLite），相同文本不重复调用 Embedding API，配合批量 API（Batch Embeddings）成本降低 60%+

**技术关键词：** RAG, Vector Search, BM25, Hybrid Retrieval, MMR Re-ranking, Temporal Decay, Embedding Cache

---

### 4. Agent 工具调用系统（Function Calling）

**简历版：**
> 设计并实现类型安全的 Agent 工具调用框架，支持工具级 + 动作级双层权限控制，覆盖 15+ 内置工具类型及插件化扩展。

**面试展开版：**
- 使用 TypeBox/JSON Schema 定义工具参数 schema，实现编译时类型检查 + 运行时参数验证，区分参数错误（400）和权限错误（403），让 LLM 能够理解错误并自动修正
- 设计 ActionGate 模式实现细粒度动作级权限控制（如 sessions 工具的 create/delete/read 动作可独立开关）
- 工具执行结果经过图像大小限制、超大 payload 截断等安全处理，防止大型工具返回填满上下文窗口
- 实现了沙箱代码执行（3 级文件系统权限：none/readonly/readwrite），防止恶意代码修改系统文件

**技术关键词：** Function Calling, Tool Use, JSON Schema Validation, Permission Control, Sandboxed Execution

---

### 5. 多渠道 Agent 路由系统

**简历版：**
> 设计了层次化 Session Key 体系和优先级路由决策引擎，支持 15+ 消息渠道的精确会话路由、隔离和状态管理。

**面试展开版：**
- 设计了层次化自描述 Session Key 格式（`agent:{agentId}:{channel}:{kind}:{peerId}[:thread:{threadId}]`），从 key 本身即可解析所有路由信息，无需额外数据库查询
- 实现 8 级优先级路由链：精确 peer > 父话题继承 > Discord 角色 > Guild > Teams > 账号 > 渠道类型 > 默认兜底
- 通过 Session Key 的结构化设计实现天然的多租户隔离（不同渠道/用户的历史完全分离，无需额外隔离机制）

**技术关键词：** Multi-channel Routing, Session Management, Multi-tenancy, Priority-based Routing

---

### 6. LLM 高可用与故障转移

**简历版：**
> 设计并实现 LLM 服务的多层高可用机制，包括 Auth Profile 冷却管理、多 key 智能轮换和跨 Provider 级联降级，实现 99.9%+ 服务可用性。

**面试展开版：**
- 实现分级冷却机制：rate_limit（60s）、quota（1h）、auth/billing（永久，需人工修复），按失败原因差异化处理，避免无效重试
- 设计最优 profile 选择算法：过滤冷却中的 key → 按最近成功时间（lastGoodAt）排序 → 失败次数少的优先，保证选出成功概率最高的 key
- 实现跨 provider 级联降级（Anthropic → OpenAI → Ollama 本地），极端情况下保证服务不中断
- 使用带 Jitter 的指数退避算法（initialMs=250, factor=2, jitter=20%）处理过载场景，防止多实例同时重试造成的雪崩效应

**技术关键词：** High Availability, Failover, Rate Limit Handling, Exponential Backoff, Multi-provider LLM

---

### 7. 多 Agent 编排（Multi-Agent Orchestration）

**简历版：**
> 设计并实现多 Agent 编排框架，支持任务分解、并发子 Agent 调度、超时控制和结果聚合，将复杂任务处理效率提升 3-5 倍。

**面试展开版：**
- 设计了 Orchestrator-Worker 编排模式：主 Agent 分解任务，通过 sessions_spawn 工具并发调度多个专门子 Agent（支持 subagent 和 ACP 两种运行时）
- 子 Agent Session Key 编码父子层级关系（`:subagent:` 分隔符），实现深度限制（默认 max=2）防止无限递归
- 实现流式输出中继（Stream Relay）：子 Agent 的实时输出通过 parent relay 传给用户，保证长时间任务的可见性
- 文件附件按值传递（snapshot-by-value）实现父子 Agent 间的数据共享，同时保持工作区隔离

**技术关键词：** Multi-Agent Orchestration, Agent Spawning, Concurrent Task Execution, ACP Protocol

---

## 📋 面试中的通用答题框架

### "介绍一下你对 AI Agent 架构的理解"

> 我理解的 Agent 架构分四层：
> 1. **感知层**（Perception）：接收用户输入，支持文本/图片/文件多模态
> 2. **决策层**（Reasoning）：LLM 推理，基于 System Prompt + History + RAG 上下文决策
> 3. **执行层**（Action）：工具调用（Function Calling），执行搜索/代码/API 等真实动作
> 4. **记忆层**（Memory）：短期（对话 History）+ 长期（RAG 向量库）+ 工作记忆（Bootstrap 文件）
>
> 工程上的核心挑战在"约束管理"：上下文窗口有限，需要 Token 预算管理；对话越来越长，需要 History 截断和压缩；工具调用可能失败，需要优雅降级；提供商不稳定，需要多 Provider 故障转移。

### "如何优化 LLM Agent 的成本？"

> 三个维度：
> 1. **减少输入 Token**：Prompt Caching（固定的 System Prompt 缓存，命中后便宜 90%）；History 截断（只发最近 N 轮）；RAG（精准召回相关片段，不全量发送知识库）
> 2. **减少 Embedding 调用**：嵌入缓存（相同内容不重复计算）；Batch API（非实时场景批量处理，便宜 50%）
> 3. **智能降级**：监控 API 成本，超额时自动切换到更便宜的模型或本地模型

### "如何保证 Agent 在长对话中不丢失关键信息？"

> 分层保护：
> 1. 短期：保留最近 N 轮（用户轮次为单位，保证语义完整性）
> 2. 中期：将早期历史压缩摘要（关键信息保留指令：任务进度、决策依据、精确 ID 必须完整保留）
> 3. 长期：RAG 向量化存储，关键信息可被后续检索（不怕 History 被清空）
> 4. 持久化：Session 完整记录到磁盘，即使服务重启也能恢复

---

## 💼 完整简历技能块示例

```
AI Agent 工程经验（基于 OpenClaw 开源项目）
• 设计多 Provider LLM 集成层，支持 20+ 提供商，实现分级冷却故障转移（rate_limit/quota/auth 差异化），
  SLA 99.9%+
• 实现混合 RAG 系统（Vector + BM25 + MMR 重排序 + 时间衰减），解决纯向量检索精确词召回差的问题，
  检索准确率提升 30%+
• 设计上下文管理层：滑动窗口截断 + LLM 摘要压缩，支持超过 context window 的超长任务对话，
  token 成本降低 40%+
• 构建多 Agent 编排框架（Orchestrator-Worker 模式），支持并发子 Agent 调度，
  复杂任务处理效率提升 3-5 倍
• 实现 Prompt Caching 策略（Anthropic native caching），重复请求 input token 费用降低 70%+
```

---

## 🔑 高频面试题速查

| 问题 | 核心答案要点 |
|------|------------|
| Context Window 管理 | 多源优先级解析 + 软/硬阈值守卫 |
| 多轮对话 Token 控制 | 轮次截断（语义完整）+ LLM 压缩 |
| RAG 优化 | Hybrid Search + MMR + 时间衰减 |
| 工具调用安全 | Schema 验证 + 权限分层 + 沙箱隔离 |
| LLM 高可用 | 冷却分级 + 最优 profile 选择 + 跨 Provider 降级 |
| 多 Agent 协作 | 深度限制 + 并发调度 + Stream Relay |
| 成本优化 | Prompt Cache + Embedding Cache + Batch API |
