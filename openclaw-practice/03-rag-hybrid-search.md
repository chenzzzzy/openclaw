# 知识点 3：RAG 混合检索（Hybrid Search）

## 1. 概念解释

### 什么是 RAG？

RAG（Retrieval-Augmented Generation，检索增强生成）是 AI Agent 的"长期记忆"机制：
1. 把文档/笔记/历史对话**切片（chunking）**并转化为**向量（embedding）**存入向量数据库
2. 当用户提问时，将问题也转为向量，**检索**最相关的文档片段
3. 将检索结果和问题一起作为 context 传给 LLM，让模型基于真实知识回答

### OpenClaw 中的 RAG 用途

- **Agent 记忆**：`~/.openclaw/agents/main/memory/*.md` 中的笔记
- **会话历史**：索引过去的对话记录供 Agent 参考
- **知识库**：用户自定义的文档目录

---

## 2. 纯向量检索的局限性

向量检索（Vector Search）基于语义相似度，但有弱点：

| 场景 | 向量搜索的问题 |
|------|--------------|
| 搜索 "API key `sk-abc123`" | 向量捕捉语义，但精确字符串匹配差 |
| 搜索特定 UUID | 向量空间中 UUID 无语义，召回率极低 |
| 搜索特定版本号 "v1.2.3" | 同上 |
| 搜索专有名词 | 如果 embedding 没见过，相似度低 |

---

## 3. OpenClaw 的混合检索架构

源码位置：`src/memory/hybrid.ts`, `src/memory/mmr.ts`, `src/memory/temporal-decay.ts`

### 3.1 BM25 全文检索补充向量检索

```typescript
// 将用户查询转为 SQLite FTS5 的 BM25 查询语法
export function buildFtsQuery(raw: string): string | null {
  // 提取所有字母数字 token
  const tokens = raw.match(/[\p{L}\p{N}_]+/gu)
    ?.map(t => t.trim())
    .filter(Boolean) ?? [];
  
  if (tokens.length === 0) return null;
  
  // 构造 FTS5 AND 查询：所有词必须同时出现
  const quoted = tokens.map(t => `"${t.replaceAll('"', '')}"`);
  return quoted.join(" AND ");  // "user" AND "api" AND "key"
}

// 将 BM25 负 rank 值转为 [0, 1] 相似度分数
export function bm25RankToScore(rank: number): number {
  if (rank < 0) {
    const relevance = -rank;
    return relevance / (1 + relevance);  // 归一化到 [0, 1]
  }
  return 1 / (1 + rank);
}
```

### 3.2 混合结果融合（Reciprocal Rank Fusion 变体）

```typescript
export async function mergeHybridResults(params: {
  vector: HybridVectorResult[];
  keyword: HybridKeywordResult[];
  vectorWeight: number;   // 向量分数权重，如 0.7
  // textWeight = 1 - vectorWeight
  mmr?: MMRConfig;
  temporalDecay?: TemporalDecayConfig;
}): Promise<MergedHybridResult[]> {
  const textWeight = 1 - params.vectorWeight;
  
  // 合并两个结果集
  const mergedMap = new Map<string, MergedHybridResult>();
  
  for (const r of params.vector) {
    mergedMap.set(r.id, {
      ...r,
      vectorScore: r.vectorScore,
      textScore: 0,
      // 加权融合分数
      score: r.vectorScore * params.vectorWeight,
    });
  }
  
  for (const r of params.keyword) {
    const existing = mergedMap.get(r.id);
    if (existing) {
      // 同时出现在两个结果集中：分数相加
      existing.textScore = r.textScore;
      existing.score += r.textScore * textWeight;
    } else {
      mergedMap.set(r.id, {
        ...r,
        vectorScore: 0,
        textScore: r.textScore,
        score: r.textScore * textWeight,
      });
    }
  }
  
  let results = [...mergedMap.values()].sort((a, b) => b.score - a.score);
  
  // 可选：时间衰减
  if (params.temporalDecay?.enabled) {
    results = applyTemporalDecayToHybridResults(results, params.temporalDecay);
  }
  
  // 可选：MMR 多样性重排序
  if (params.mmr?.enabled) {
    results = applyMMRToHybridResults(results, params.mmr);
  }
  
  return results;
}
```

---

## 4. MMR（最大边际相关性）重排序

### 问题背景

纯相似度排序会导致**结果冗余**：

```
用户问："如何配置 API？"
Top 3 结果：
  1. "API 配置说明第1段..."    (相似度 0.95)
  2. "API 配置说明第2段..."    (相似度 0.94) ← 和第1段高度重叠
  3. "API 配置说明第3段..."    (相似度 0.93) ← 同上
```

用户真正需要的可能是：API 配置 + 认证方式 + 错误处理，而不是三段重叠的内容。

### MMR 算法（Carbonell & Goldstein, 1998）

源码位置：`src/memory/mmr.ts`

```typescript
// MMR 选择标准：
// score = λ × 相关度 - (1-λ) × max_与已选结果的相似度
// λ = 1: 完全按相关度排序（退化为普通排序）
// λ = 0: 完全按多样性排序
// λ = 0.7（默认）: 偏重相关度，兼顾多样性

export function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  return new Set(tokens);
}

export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionSize++;
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

export function applyMMR(
  candidates: MMRItem[],
  config: MMRConfig,
): MMRItem[] {
  if (!config.enabled || candidates.length === 0) return candidates;
  
  const selected: MMRItem[] = [];
  const remaining = [...candidates];
  
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].score;
      
      // 计算与已选结果的最大相似度
      const maxSim = selected.length === 0 ? 0 :
        Math.max(...selected.map(s => 
          jaccardSimilarity(
            tokenize(remaining[i].content),
            tokenize(s.content)
          )
        ));
      
      const mmrScore = config.lambda * relevance - (1 - config.lambda) * maxSim;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    
    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  
  return selected;
}
```

---

## 5. 时间衰减（Temporal Decay）

**核心思想：** 最近的记忆比陈旧的记忆更有价值。

源码位置：`src/memory/temporal-decay.ts`

```typescript
// 半衰期衰减公式（指数衰减）
// score_adjusted = score × e^(-λ × age_in_days)
// 其中 λ = ln(2) / half_life_days

export function toDecayLambda(halfLifeDays: number): number {
  return Math.LN2 / halfLifeDays;  // ln(2) ≈ 0.693
}

export function calculateTemporalDecayMultiplier(params: {
  ageInDays: number;
  halfLifeDays: number;
}): number {
  const lambda = toDecayLambda(params.halfLifeDays);
  return Math.exp(-lambda * params.ageInDays);
}

// halfLifeDays=30 的示例：
// 1天前的记忆：multiplier = e^(-0.0231 × 1) ≈ 0.977  （几乎无衰减）
// 30天前：     multiplier = e^(-0.0231 × 30) ≈ 0.5   （半衰减）
// 90天前：     multiplier = e^(-0.0231 × 90) ≈ 0.125  （大幅衰减）
```

**配置示例：**
```yaml
memory:
  query:
    temporalDecay:
      enabled: true
      halfLifeDays: 30  # 30天后记忆相关性降为一半
```

---

## 6. 完整 RAG 管线

```
用户查询
  ↓
Query Expansion（可选，用 LLM 扩展查询关键词）
  ↓
并行检索
  ├── Vector Search（向量相似度检索）
  └── BM25 Search（关键词全文检索）
  ↓
Hybrid Fusion（加权融合，vectorWeight=0.7）
  ↓
Temporal Decay（时间衰减，可选）
  ↓
MMR Re-ranking（多样性重排序，可选）
  ↓
Top-K 结果注入 System Prompt
```

---

## 7. 面试关键问答

**Q: 纯向量检索有什么问题？你如何解决？**

A: 纯向量检索对精确关键词匹配（UUID、版本号、API key）召回率差，且结果可能高度冗余（多个语义相似但内容重复的片段）。解决方案：①混合检索（vector + BM25，加权融合），BM25 补充精确关键词匹配能力；②MMR 重排序（λ=0.7 在相关性和多样性间平衡，算法是贪心选择最大化 λ×相关度-(1-λ)×与已选结果相似度）；③时间衰减（最近记忆权重更高）。

**Q: 如何评估 RAG 的检索质量？**

A: 关键指标：召回率（Recall@K）、MRR（Mean Reciprocal Rank）、NDCG。实践中可以用 LLM-as-a-judge 评估检索结果是否真的帮助了回答质量。

---

## 练习题

→ [exercises/ex03-rag-mmr.ts](./exercises/ex03-rag-mmr.ts)

→ [exercises/ex04-hybrid-search.ts](./exercises/ex04-hybrid-search.ts)

→ 标准答案：[answers/ans03-rag-mmr.ts](./answers/ans03-rag-mmr.ts)

→ 标准答案：[answers/ans04-hybrid-search.ts](./answers/ans04-hybrid-search.ts)
