/**
 * 练习题 4：混合检索结果融合（Hybrid Search Fusion）
 *
 * 背景：
 * 纯向量检索适合语义搜索，BM25 适合精确关键词匹配。
 * 混合检索将两者结果融合，充分利用各自优势。
 * 本题实现融合算法：加权线性组合 + 时间衰减。
 *
 * 任务 1：实现 bm25RankToScore（将 BM25 的负 rank 转为 [0,1] 相似度分数）
 * 任务 2：实现 mergeHybridResults（融合向量和关键词检索结果）
 * 任务 3：实现 applyTemporalDecay（为每个结果应用时间衰减）
 */

// ============================================================
// 类型定义
// ============================================================

export type VectorResult = {
  id: string;
  content: string;
  vectorScore: number;   // [0, 1]，向量相似度
  createdAt?: Date;      // 创建时间（用于时间衰减）
};

export type KeywordResult = {
  id: string;
  content: string;
  bm25Rank: number;      // BM25 rank，通常为负数（rank 越小 = 越相关）
  createdAt?: Date;
};

export type HybridResult = {
  id: string;
  content: string;
  vectorScore: number;
  textScore: number;
  finalScore: number;    // 融合后的最终分数
  createdAt?: Date;
};

// ============================================================
// 练习 4.1：实现 bm25RankToScore
// ============================================================

/**
 * 将 BM25 的 rank 值转换为 [0, 1] 的相似度分数
 *
 * BM25 的 rank 值通常为负数，越小（越负）表示越相关
 * SQLite FTS5 的 bm25() 函数返回负数：越小越好
 *
 * 转换公式：
 * - 如果 rank < 0：relevance = -rank，score = relevance / (1 + relevance)
 * - 否则：score = 1 / (1 + rank)
 * - rank 为 NaN 或无穷大：返回 1 / (1 + 999) ≈ 0.001（惩罚）
 *
 * @example
 * bm25RankToScore(-5.0)   → 5 / (1+5) = 0.833...
 * bm25RankToScore(-1.0)   → 1 / (1+1) = 0.5
 * bm25RankToScore(-0.1)   → 0.1 / (1+0.1) ≈ 0.091
 * bm25RankToScore(0)      → 1 / (1+0) = 1.0
 * bm25RankToScore(Infinity) → 1 / 1000 = 0.001
 */
export function bm25RankToScore(rank: number): number {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 4.2：实现 mergeHybridResults
// ============================================================

/**
 * 融合向量检索和关键词检索结果
 *
 * 融合规则：
 * 1. 将 keyword 结果的 bm25Rank 转为 textScore（用 bm25RankToScore）
 * 2. 同时在两个结果集中的文档：finalScore = vectorScore * vw + textScore * tw
 * 3. 只在 vector 结果中：finalScore = vectorScore * vw（textScore=0）
 * 4. 只在 keyword 结果中：finalScore = textScore * tw（vectorScore=0）
 * 5. 按 finalScore 降序排列
 *
 * 其中 tw = 1 - vectorWeight
 *
 * @param vectorResults - 向量检索结果列表
 * @param keywordResults - 关键词检索结果列表
 * @param vectorWeight - 向量分数权重，[0, 1]
 */
export function mergeHybridResults(params: {
  vectorResults: VectorResult[];
  keywordResults: KeywordResult[];
  vectorWeight: number;
}): HybridResult[] {
  // TODO: 实现此函数
  // 提示：
  // 1. 用 Map<id, HybridResult> 合并两个列表
  // 2. 遍历 vectorResults，创建条目（textScore=0）
  // 3. 遍历 keywordResults，若已存在则更新 textScore，否则新建（vectorScore=0）
  // 4. 重新计算每个条目的 finalScore
  // 5. 转为数组并按 finalScore 降序排列
  throw new Error("Not implemented");
}

// ============================================================
// 练习 4.3：实现 applyTemporalDecay
// ============================================================

/**
 * 对混合检索结果应用时间衰减，调整 finalScore
 *
 * 时间衰减公式（指数衰减）：
 *   decayMultiplier = e^(-λ × ageInDays)
 *   其中 λ = ln(2) / halfLifeDays
 *
 * finalScore 调整后 = finalScore × decayMultiplier
 *
 * 没有 createdAt 的结果不做衰减（保持原分数）
 *
 * @param results - 待处理的混合检索结果
 * @param now - 当前时间（用于计算 age）
 * @param halfLifeDays - 半衰期（天数），30 表示 30 天后分数降为原来的 50%
 */
export function applyTemporalDecay(
  results: HybridResult[],
  now: Date,
  halfLifeDays: number,
): HybridResult[] {
  // TODO: 实现此函数
  // 提示：
  // 1. λ = Math.LN2 / halfLifeDays
  // 2. ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24)
  // 3. multiplier = Math.exp(-λ × ageInDays)
  // 4. 不修改原数组，返回新数组（不可变）
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log("=== 练习 4.1：bm25RankToScore ===\n");

  const s1 = bm25RankToScore(-5.0);
  console.assert(Math.abs(s1 - 5 / 6) < 0.001, `❌ rank=-5，期望 ${(5 / 6).toFixed(3)}，得到 ${s1.toFixed(3)}`);
  console.log(`✅ rank=-5.0 → score=${s1.toFixed(3)}`);

  const s2 = bm25RankToScore(-1.0);
  console.assert(Math.abs(s2 - 0.5) < 0.001, `❌ rank=-1，期望 0.5，得到 ${s2}`);
  console.log(`✅ rank=-1.0 → score=${s2.toFixed(3)}`);

  const s3 = bm25RankToScore(0);
  console.assert(s3 === 1.0, `❌ rank=0，期望 1.0，得到 ${s3}`);
  console.log(`✅ rank=0 → score=${s3.toFixed(3)}`);

  const s4 = bm25RankToScore(Infinity);
  console.assert(Math.abs(s4 - 1 / 1000) < 0.001, `❌ rank=Infinity，期望 0.001，得到 ${s4}`);
  console.log(`✅ rank=Infinity → score=${s4.toFixed(4)}`);

  console.log("\n=== 练习 4.2：mergeHybridResults ===\n");

  const vectorResults: VectorResult[] = [
    { id: "a", content: "Python machine learning tutorial", vectorScore: 0.9 },
    { id: "b", content: "Deep learning with TensorFlow", vectorScore: 0.8 },
    { id: "c", content: "React hooks introduction", vectorScore: 0.6 },
  ];

  const keywordResults: KeywordResult[] = [
    { id: "a", content: "Python machine learning tutorial", bm25Rank: -3.0 },
    { id: "d", content: "sklearn Python API reference", bm25Rank: -2.0 },
  ];

  const merged = mergeHybridResults({
    vectorResults,
    keywordResults,
    vectorWeight: 0.7,
  });

  // id="a" 同时在两个结果中，分数最高
  console.assert(merged[0].id === "a", `❌ id=a 应该排第一，得到 ${merged[0].id}`);
  console.assert(merged[0].vectorScore === 0.9, "❌ id=a 的 vectorScore 应为 0.9");
  console.assert(merged[0].textScore > 0, "❌ id=a 的 textScore 应大于 0");
  console.log(`✅ id=a 排第一，finalScore=${merged[0].finalScore.toFixed(3)}`);

  // id="d" 只在 keyword 结果中，vectorScore=0
  const dResult = merged.find(r => r.id === "d");
  console.assert(dResult !== undefined, "❌ id=d 应在结果中");
  console.assert(dResult!.vectorScore === 0, "❌ id=d 的 vectorScore 应为 0");
  console.assert(dResult!.textScore > 0, "❌ id=d 的 textScore 应大于 0");
  console.log(`✅ id=d（纯关键词），vectorScore=0，textScore=${dResult!.textScore.toFixed(3)}`);

  // 结果数量：a, b, c, d = 4个
  console.assert(merged.length === 4, `❌ 期望 4 个结果，得到 ${merged.length}`);
  console.log(`✅ 融合后共 ${merged.length} 个结果`);

  console.log("\n=== 练习 4.3：applyTemporalDecay ===\n");

  const now = new Date("2024-01-31");
  const results: HybridResult[] = [
    { id: "new", content: "Recent doc", vectorScore: 0.8, textScore: 0, finalScore: 0.8,
      createdAt: new Date("2024-01-30") },  // 1 天前
    { id: "old", content: "Old doc", vectorScore: 0.8, textScore: 0, finalScore: 0.8,
      createdAt: new Date("2024-01-01") },  // 30 天前（半衰期）
    { id: "nodate", content: "No date", vectorScore: 0.8, textScore: 0, finalScore: 0.8 },
  ];

  const decayed = applyTemporalDecay(results, now, 30);

  const newDoc = decayed.find(r => r.id === "new")!;
  const oldDoc = decayed.find(r => r.id === "old")!;
  const noDateDoc = decayed.find(r => r.id === "nodate")!;

  // 1天前的文档，衰减很小（应接近原分数）
  console.assert(newDoc.finalScore > 0.75, `❌ 1天前文档分数应接近 0.8，得到 ${newDoc.finalScore.toFixed(3)}`);
  console.log(`✅ 1天前文档: finalScore=${newDoc.finalScore.toFixed(3)}`);

  // 30天前（半衰期）的文档，分数应约为原来的 50%
  console.assert(Math.abs(oldDoc.finalScore - 0.4) < 0.05, 
    `❌ 30天前文档（半衰期）分数应约为 0.4，得到 ${oldDoc.finalScore.toFixed(3)}`);
  console.log(`✅ 30天前文档（半衰期）: finalScore=${oldDoc.finalScore.toFixed(3)} ≈ 0.4`);

  // 没有日期的文档不做衰减
  console.assert(noDateDoc.finalScore === 0.8, `❌ 无日期文档不应衰减，得到 ${noDateDoc.finalScore}`);
  console.log(`✅ 无日期文档: finalScore=${noDateDoc.finalScore} （不衰减）`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
