/**
 * 标准答案 4：混合检索结果融合
 */

export type VectorResult = {
  id: string; content: string; vectorScore: number; createdAt?: Date;
};
export type KeywordResult = {
  id: string; content: string; bm25Rank: number; createdAt?: Date;
};
export type HybridResult = {
  id: string; content: string; vectorScore: number; textScore: number;
  finalScore: number; createdAt?: Date;
};

/**
 * 将 BM25 rank（通常为负数）转为 [0, 1] 相似度分数
 */
export function bm25RankToScore(rank: number): number {
  if (!Number.isFinite(rank)) {
    return 1 / (1 + 999);  // 惩罚非法值
  }
  if (rank < 0) {
    const relevance = -rank;
    return relevance / (1 + relevance);
  }
  return 1 / (1 + rank);
}

/**
 * 融合向量检索和关键词检索结果
 *
 * 加权线性融合：finalScore = vectorScore × vw + textScore × tw
 */
export function mergeHybridResults(params: {
  vectorResults: VectorResult[];
  keywordResults: KeywordResult[];
  vectorWeight: number;
}): HybridResult[] {
  const textWeight = 1 - params.vectorWeight;
  const mergedMap = new Map<string, HybridResult>();

  // 添加向量结果（textScore 初始为 0）
  for (const r of params.vectorResults) {
    mergedMap.set(r.id, {
      id: r.id,
      content: r.content,
      vectorScore: r.vectorScore,
      textScore: 0,
      finalScore: r.vectorScore * params.vectorWeight,
      createdAt: r.createdAt,
    });
  }

  // 融合关键词结果
  for (const r of params.keywordResults) {
    const textScore = bm25RankToScore(r.bm25Rank);
    const existing = mergedMap.get(r.id);

    if (existing) {
      // 同时出现在两个结果集：更新 textScore 并重算 finalScore
      existing.textScore = textScore;
      existing.finalScore = existing.vectorScore * params.vectorWeight + textScore * textWeight;
    } else {
      // 只在关键词结果中
      mergedMap.set(r.id, {
        id: r.id,
        content: r.content,
        vectorScore: 0,
        textScore: textScore,
        finalScore: textScore * textWeight,
        createdAt: r.createdAt,
      });
    }
  }

  // 转数组并降序排列
  return [...mergedMap.values()].sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * 应用时间衰减（指数衰减）
 * decayMultiplier = e^(-λ × ageInDays)，λ = ln(2) / halfLifeDays
 */
export function applyTemporalDecay(
  results: HybridResult[],
  now: Date,
  halfLifeDays: number,
): HybridResult[] {
  const lambda = Math.LN2 / halfLifeDays;
  const DAY_MS = 24 * 60 * 60 * 1000;

  return results.map(r => {
    if (!r.createdAt) return r;  // 没有日期，不衰减

    const ageInDays = (now.getTime() - r.createdAt.getTime()) / DAY_MS;
    const clampedAge = Math.max(0, ageInDays);
    const multiplier = Math.exp(-lambda * clampedAge);

    return { ...r, finalScore: r.finalScore * multiplier };
  });
}

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 4.1：bm25RankToScore ===\n");

  console.assert(Math.abs(bm25RankToScore(-5.0) - 5 / 6) < 0.001, "❌ rank=-5");
  console.assert(Math.abs(bm25RankToScore(-1.0) - 0.5) < 0.001, "❌ rank=-1");
  console.assert(bm25RankToScore(0) === 1.0, "❌ rank=0");
  console.assert(Math.abs(bm25RankToScore(Infinity) - 0.001) < 0.001, "❌ rank=Infinity");
  console.log("✅ bm25RankToScore 全部通过");

  console.log("\n=== 答案 4.2：mergeHybridResults ===\n");

  const merged = mergeHybridResults({
    vectorResults: [
      { id: "a", content: "Python ML", vectorScore: 0.9 },
      { id: "b", content: "Deep learning", vectorScore: 0.8 },
    ],
    keywordResults: [
      { id: "a", content: "Python ML", bm25Rank: -3.0 },
      { id: "d", content: "sklearn API", bm25Rank: -2.0 },
    ],
    vectorWeight: 0.7,
  });

  console.assert(merged[0].id === "a", `❌ id=a 应排第一`);
  console.assert(merged[0].textScore > 0, "❌ id=a textScore > 0");
  console.assert(merged.find(r => r.id === "d")?.vectorScore === 0, "❌ id=d vectorScore=0");
  console.assert(merged.length === 3, `❌ 应有 3 个结果：a,b,d`);
  console.log(`✅ 融合结果: ${merged.map(r => `${r.id}(${r.finalScore.toFixed(3)})`).join(", ")}`);

  console.log("\n=== 答案 4.3：applyTemporalDecay ===\n");

  const now = new Date("2024-01-31");
  const results: HybridResult[] = [
    { id: "new", content: "", vectorScore: 0.8, textScore: 0, finalScore: 0.8, createdAt: new Date("2024-01-30") },
    { id: "old", content: "", vectorScore: 0.8, textScore: 0, finalScore: 0.8, createdAt: new Date("2024-01-01") },
    { id: "nodate", content: "", vectorScore: 0.8, textScore: 0, finalScore: 0.8 },
  ];

  const decayed = applyTemporalDecay(results, now, 30);
  const oldDoc = decayed.find(r => r.id === "old")!;
  const noDateDoc = decayed.find(r => r.id === "nodate")!;

  console.assert(Math.abs(oldDoc.finalScore - 0.4) < 0.05, `❌ 半衰期后约 0.4，得到 ${oldDoc.finalScore}`);
  console.assert(noDateDoc.finalScore === 0.8, "❌ 无日期不衰减");
  console.log(`✅ 衰减: 30天前=${oldDoc.finalScore.toFixed(3)}, 无日期=${noDateDoc.finalScore}`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
