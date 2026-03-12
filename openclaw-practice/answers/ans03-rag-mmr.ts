/**
 * 标准答案 3：MMR 最大边际相关性重排序
 */

export type SearchResult = {
  id: string;
  content: string;
  score: number;
};

export type MMRConfig = {
  lambda: number;
};

/**
 * 将文本 token 化为小写词汇集合
 */
export function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  return new Set(tokens);
}

/**
 * 计算两集合的 Jaccard 相似度 = |交集| / |并集|
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  const smaller = setA.size <= setB.size ? setA : setB;
  const larger = setA.size <= setB.size ? setB : setA;

  for (const token of smaller) {
    if (larger.has(token)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * MMR 贪心重排序算法
 *
 * 每次选择：score = λ × relevance - (1-λ) × max_similarity(candidate, selected)
 */
export function applyMMR(candidates: SearchResult[], config: MMRConfig): SearchResult[] {
  if (candidates.length === 0) return [];

  // 预计算每个候选的 token 集（避免重复计算）
  const tokenSets = new Map<string, Set<string>>();
  for (const c of candidates) {
    tokenSets.set(c.id, tokenize(c.content));
  }

  const selected: SearchResult[] = [];
  const remaining = [...candidates];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const candidateTokens = tokenSets.get(candidate.id)!;

      // 计算与已选结果的最大相似度
      const maxSim = selected.length === 0
        ? 0
        : Math.max(
            ...selected.map(s =>
              jaccardSimilarity(candidateTokens, tokenSets.get(s.id)!)
            )
          );

      // MMR 分数
      const mmrScore = config.lambda * candidate.score - (1 - config.lambda) * maxSim;

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

// ============================================================
// 测试验证
// ============================================================

function runTests() {
  console.log("=== 答案 3.1：tokenize ===\n");

  const t1 = tokenize("Hello World hello");
  console.assert(t1.size === 2 && t1.has("hello") && t1.has("world"), `❌ tokenize 测试1`);
  console.log(`✅ tokenize: ${[...t1].join(", ")}`);

  console.log("\n=== 答案 3.2：jaccardSimilarity ===\n");

  const j1 = jaccardSimilarity(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]));
  console.assert(Math.abs(j1 - 0.5) < 0.001, `❌ 期望 0.5，得到 ${j1}`);
  console.log(`✅ Jaccard {a,b,c}∩{b,c,d}: ${j1.toFixed(3)}`);

  const j4 = jaccardSimilarity(new Set(), new Set());
  console.assert(j4 === 1.0, `❌ 空集 Jaccard 应为 1.0`);
  console.log(`✅ 空集 Jaccard: ${j4}`);

  console.log("\n=== 答案 3.3：applyMMR ===\n");

  const candidates: SearchResult[] = [
    { id: "1", content: "Python is great for data science and machine learning", score: 0.95 },
    { id: "2", content: "Python is perfect for data science applications", score: 0.93 },
    { id: "3", content: "JavaScript is a programming language for web development", score: 0.70 },
    { id: "4", content: "TypeScript adds types to JavaScript for better code quality", score: 0.65 },
  ];

  // λ=1：纯按相关度
  const r1 = applyMMR(candidates, { lambda: 1.0 });
  console.assert(r1[0].id === "1" && r1[1].id === "2", `❌ λ=1 排序错误`);
  console.log(`✅ λ=1.0: ${r1.map(r => r.id).join(" → ")}`);

  // λ=0.5：平衡相关性和多样性
  const r2 = applyMMR(candidates, { lambda: 0.5 });
  console.assert(r2[0].id === "1", `❌ 第一个应是 id=1`);
  const idx2 = r2.findIndex(r => r.id === "2");
  const idx3 = r2.findIndex(r => r.id === "3");
  console.assert(idx3 < idx2, `❌ 多样性更高的 id=3 应排在 id=2 前面`);
  console.log(`✅ λ=0.5: ${r2.map(r => r.id).join(" → ")} (3 在 2 前，体现多样性)`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
