# 知识点 10：插件/技能扩展架构（Plugin System）

## 1. 概念解释

### 为什么 Agent 需要插件系统？

Agent 的能力边界不可能由核心团队完全覆盖：
- 不同用户有不同的第三方工具需求（GitHub、HubSpot、Stripe、Apple Reminders...）
- 企业内部的私有系统（ERP、CRM、自研 API）
- 开发者希望扩展 Agent 的行为，但不必修改核心代码

**插件系统** 允许第三方开发者以标准化方式扩展 Agent 能力：
1. 在 Clawhub 市场发布技能（Skill）
2. 用户通过 `openclaw skills install <skill-name>` 安装
3. Agent 自动获得新工具，无需重启或修改配置

---

## 2. OpenClaw 插件架构

源码位置：`src/plugins/`, `skills/`（内置技能）

### 2.1 插件的两种形式

**1. Skills（技能）**：工具类型的扩展
```
~/.openclaw/agents/main/skills/
├── github/          ← 安装的 github skill
│   ├── package.json
│   ├── index.js     ← 工具实现
│   └── tools.json   ← 工具 schema 定义
├── hubspot/
└── apple-reminders/
```

**2. Extensions（扩展）**：系统级扩展（如新的消息渠道）
```
extensions/
├── msteams/         ← Microsoft Teams 渠道
├── matrix/          ← Matrix 协议渠道
└── zalo/            ← Zalo 渠道
```

### 2.2 技能工具加载流程

```typescript
// src/plugins/tools.ts
export function resolvePluginTools(params: {
  allowlist?: string[];
  agentDir?: string;
}): AnyAgentTool[] {
  // 1. 扫描已安装的 skills 目录
  const skillsDir = path.join(params.agentDir ?? agentDir, "skills");
  const installedSkills = fs.readdirSync(skillsDir);
  
  const tools: AnyAgentTool[] = [];
  
  for (const skillName of installedSkills) {
    // 2. 检查白名单（config 里配置了 tools 列表）
    if (params.allowlist && !params.allowlist.includes(skillName)) {
      continue;  // 未在白名单，跳过
    }
    
    // 3. 动态加载技能模块
    const skillModule = require(path.join(skillsDir, skillName));
    
    // 4. 调用标准化接口获取工具列表
    const skillTools = skillModule.createTools({
      config: loadAgentConfig(),
    });
    
    tools.push(...skillTools);
  }
  
  return tools;
}
```

### 2.3 Plugin SDK（技能开发接口）

```typescript
// src/plugin-sdk/ - 第三方开发者使用的 SDK

// 技能包的标准结构
export interface SkillModule {
  // 必须实现：返回工具列表
  createTools(context: SkillContext): AnyAgentTool[];
  
  // 可选：技能初始化
  initialize?(context: SkillContext): Promise<void>;
  
  // 可选：插件 Hook（在 Agent 处理前后执行）
  hooks?: {
    beforeAgentStart?: PluginHookBeforeAgentStart;
    afterAgentComplete?: PluginHookAfterAgentComplete;
  };
}

export interface SkillContext {
  agentDir: string;      // Agent 工作目录
  config: OpenClawConfig; // 全局配置
  logger: Logger;         // 日志接口
}
```

### 2.4 Hook 系统（Before/After Agent）

```typescript
// 插件可以在 Agent 运行前后注入逻辑
// src/plugins/hook-runner-global.ts

export type PluginHookBeforeAgentStartResult = {
  systemPromptSuffix?: string;   // 追加到 system prompt
  extraTools?: AnyAgentTool[];   // 动态添加工具
  abort?: boolean;               // 中止本次 Agent 运行
  abortReason?: string;          // 中止原因（展示给用户）
};

// Agent 运行前调用所有插件的 beforeAgentStart hook
const hookResults = await Promise.all(
  loadedPlugins.map(p => p.hooks?.beforeAgentStart?.(context))
);

// 合并 hook 结果
for (const result of hookResults.filter(Boolean)) {
  if (result.abort) {
    return { status: "aborted", reason: result.abortReason };
  }
  systemPromptSuffix += result.systemPromptSuffix ?? "";
  extraTools.push(...(result.extraTools ?? []));
}
```

---

## 3. 依赖管理与运行时解析

### 技能的 npm 依赖

```json
// skills/github/package.json
{
  "name": "@openclaw/skill-github",
  "version": "1.0.0",
  "dependencies": {
    "@octokit/rest": "^20.0.0"    // 运行时依赖，安装时会 npm install
  },
  "devDependencies": {
    "openclaw": "^2024.0.0"        // 类型定义，不进生产包
  }
}
```

**关键规则：**
- `dependencies` 中的包在 `npm install` 时会被安装到技能目录下
- `openclaw` 本体放 `devDependencies` 或 `peerDependencies`（避免版本冲突）
- 绝不使用 `workspace:*`（工作区协议），因为 npm 安装不支持

### jiti 动态加载（避免预编译）

```typescript
// 使用 jiti 在运行时直接执行 TypeScript，无需预编译
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  // openclaw/plugin-sdk 路径别名
  alias: {
    "openclaw/plugin-sdk": resolve(__dirname, "../plugin-sdk/index.js"),
  },
});

// 动态加载技能（TypeScript 源码直接运行）
const skill = await jiti.import(skillEntry);
```

---

## 4. 面试关键问答

**Q: 如何设计一个可扩展的 Agent 工具/插件系统？**

A: 关键设计决策：①标准化接口（`createTools` 返回 `AgentTool[]`，插件只需实现这一个函数）；②安全隔离（插件在用户指定的白名单内，ownerOnly 标记防止非授权调用）；③Hook 系统（`beforeAgentStart` / `afterAgentComplete` 允许插件注入 system prompt 和额外工具，而不需要修改 Agent 核心代码）；④npm 生态复用（每个插件是独立的 npm 包，有自己的依赖，不污染主包的依赖树）；⑤热加载（新安装的插件无需重启即可使用，下次 Agent 调用时自动扫描加载）。

---

## 进一步学习

如果想深入理解插件系统，建议阅读：
- `src/plugins/` 目录下的所有文件
- `skills/github/` 看一个完整的技能实现
- `src/agents/openclaw-tools.ts` 中的 `resolvePluginTools` 调用
