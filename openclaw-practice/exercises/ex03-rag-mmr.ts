/**
 * 练习题 3：MMR 最大边际相关性重排序
 *
 * 背景：
 * RAG 系统的向量检索会返回按相似度排序的结果，但这些结果可能高度冗余
 * （例如同一文档的多个相邻段落）。MMR 算法在保留相关性的同时增加结果多样性。
 *
 * MMR 公式（Carbonell & Goldstein, 1998）：
 *   score = λ × relevance(doc) - (1-λ) × max_similarity(doc, selected_docs)
 *
 * 任务 1：实现 tokenize 函数（文本 token 化，用于 Jaccard 相似度计算）
 * 任务 2：实现 jaccardSimilarity 函数
 * 任务 3：实现 applyMMR 函数（完整的 MMR 重排序算法）
 */

// ============================================================
// 类型定义
// ============================================================

export type SearchResult = {
  id: string;
  content: string;
  score: number;  // 原始相关度分数，[0, 1]
};

export type MMRConfig = {
  lambda: number;  // [0, 1]，越接近 1 越偏重相关性，越接近 0 越偏重多样性
};

// ============================================================
// 练习 3.1：实现 tokenize
// ============================================================

/**
 * 将文本 token 化为小写字母数字词汇集合（Set 去重）
 *
 * @example
 * tokenize("Hello World hello")
 * // → Set { "hello", "world" }  （去重 + 小写）
 *
 * tokenize("The quick brown fox")
 * // → Set { "the", "quick", "brown", "fox" }
 */
export function tokenize(text: string): Set<string> {
  // TODO: 实现此函数
  // 提示：
  // 1. 转小写
  // 2. 用正则 /[a-z0-9_]+/g 提取所有 token
  // 3. 放入 Set（自动去重）
  throw new Error("Not implemented");
}

// ============================================================
// 练习 3.2：实现 jaccardSimilarity
// ============================================================

/**
 * 计算两个集合的 Jaccard 相似度
 * Jaccard = |交集| / |并集|
 *
 * @example
 * jaccardSimilarity(new Set(["a","b","c"]), new Set(["b","c","d"]))
 * // → 2/4 = 0.5
 *
 * jaccardSimilarity(new Set(["a","b"]), new Set(["a","b"]))
 * // → 1.0 （完全相同）
 *
 * jaccardSimilarity(new Set(["a"]), new Set(["b"]))
 * // → 0.0 （完全不同）
 *
 * jaccardSimilarity(new Set(), new Set())
 * // → 1.0 （两个空集相同）
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  // TODO: 实现此函数
  throw new Error("Not implemented");
}

// ============================================================
// 练习 3.3：实现 applyMMR
// ============================================================

/**
 * 使用 MMR 算法对搜索结果重排序
 *
 * 算法步骤（贪心）：
 * 1. 初始化 selected = []，remaining = [...candidates]
 * 2. 每次迭代：
 *    - 对 remaining 中的每个候选，计算 MMR 分数：
 *      mmrScore = λ × candidate.score - (1-λ) × max_similarity(candidate, selected)
 *    - 选择 MMR 分数最高的候选，移入 selected
 * 3. 直到 remaining 为空
 * 4. 返回 selected（按选择顺序）
 *
 * 注意：当 selected 为空时，max_similarity = 0（直接选相关度最高的）
 *
 * @example
 * const results = [
 *   { id: "1", content: "Python is great for data science", score: 0.95 },
 *   { id: "2", content: "Python is great for machine learning", score: 0.93 },
 *   { id: "3", content: "JavaScript runs in browsers", score: 0.70 },
 * ];
 *
 * applyMMR(results, { lambda: 0.5 })
 * // 结果 2 和结果 1 内容高度相似，MMR 会优先选 1（最相关），
 * // 然后选 3（虽然相关性低，但与已选的1差异大），
 * // 最后选 2。
 */
export function applyMMR(candidates: SearchResult[], config: MMRConfig): SearchResult[] {
  // TODO: 实现此函数
  // 提示：
  // 1. 预先计算每个候选的 tokenSet（避免重复计算）
  // 2. 用贪心算法逐步选择
  // 3. 每次选择后，更新 remaining（移除已选）
  throw new Error("Not implemented");
}

// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log("=== 练习 3.1：tokenize ===\n");

  const t1 = tokenize("Hello World hello");
  console.assert(t1.has("hello"), "❌ 应包含 hello");
  console.assert(t1.has("world"), "❌ 应包含 world");
  console.assert(t1.size === 2, `❌ Set 应有 2 个元素（去重），实际 ${t1.size}`);
  console.log(`✅ tokenize 测试1: ${[...t1].join(", ")}`);

  const t2 = tokenize("  API key sk-abc123  ");
  console.assert(t2.has("api"), "❌ 应包含 api");
  console.assert(t2.has("sk"), "❌ 应包含 sk");
  console.assert(t2.has("abc123"), "❌ 应包含 abc123");
  console.log(`✅ tokenize 测试2: ${[...t2].join(", ")}`);

  console.log("\n=== 练习 3.2：jaccardSimilarity ===\n");

  const j1 = jaccardSimilarity(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]));
  console.assert(Math.abs(j1 - 0.5) < 0.001, `❌ 期望 0.5，得到 ${j1}`);
  console.log(`✅ Jaccard 测试1: ${j1.toFixed(3)}`);

  const j2 = jaccardSimilarity(new Set(["a", "b"]), new Set(["a", "b"]));
  console.assert(j2 === 1.0, `❌ 期望 1.0，得到 ${j2}`);
  console.log(`✅ Jaccard 测试2: ${j2.toFixed(3)}`);

  const j3 = jaccardSimilarity(new Set(["a"]), new Set(["b"]));
  console.assert(j3 === 0.0, `❌ 期望 0.0，得到 ${j3}`);
  console.log(`✅ Jaccard 测试3: ${j3.toFixed(3)}`);

  const j4 = jaccardSimilarity(new Set(), new Set());
  console.assert(j4 === 1.0, `❌ 空集-空集 Jaccard 应为 1.0，得到 ${j4}`);
  console.log(`✅ Jaccard 测试4 (空集): ${j4.toFixed(3)}`);

  console.log("\n=== 练习 3.3：applyMMR ===\n");

  const candidates: SearchResult[] = [
    { id: "1", content: "Python is great for data science and machine learning", score: 0.95 },
    { id: "2", content: "Python is perfect for data science applications", score: 0.93 },
    { id: "3", content: "JavaScript is a programming language for web development", score: 0.70 },
    { id: "4", content: "TypeScript adds types to JavaScript for better code quality", score: 0.65 },
  ];

  // λ=1：完全按相关度（不考虑多样性）
  const r1 = applyMMR(candidates, { lambda: 1.0 });
  console.assert(r1[0].id === "1", `❌ λ=1时，第一个应是相关度最高的 id=1，得到 id=${r1[0].id}`);
  console.assert(r1[1].id === "2", `❌ λ=1时，第二个应是 id=2`);
  console.log(`✅ λ=1.0 排序: ${r1.map(r => r.id).join(" → ")}`);

  // λ=0.5：平衡相关性和多样性
  const r2 = applyMMR(candidates, { lambda: 0.5 });
  console.assert(r2[0].id === "1", `❌ 第一个应是 id=1（最相关）`);
  // id=2 和 id=1 高度相似，id=3 和 id=1 差异大
  // 所以 id=3 应排在 id=2 之前
  const idx2 = r2.findIndex(r => r.id === "2");
  const idx3 = r2.findIndex(r => r.id === "3");
  console.assert(idx3 < idx2, `❌ λ=0.5时，多样性更高的 id=3 应排在 id=2 之前`);
  console.log(`✅ λ=0.5 排序: ${r2.map(r => r.id).join(" → ")} （多样性结果出现更早）`);

  console.log("\n✅ 所有测试通过！");
}

runTests();
