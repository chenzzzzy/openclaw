# Mini OpenClaw 工作记录

分支：

- `codex/openclaw-rebuild-blueprint`

## 已完成

- 基于源码和文档分析了当前 OpenClaw 的架构
- 识别出真正值得重建的核心子系统
- 区分了必须自己重建的模块和可以简化的产品表面
- 为一个更小的个人版实现制定了作品集导向的路线图
- 编写了用于分阶段 VibeCoding 开发的 Codex 提示词手册
- 为新实现创建了初始代码骨架

## 当前分支中的交付物

- `mini-openclaw/README.md`
- `mini-openclaw/ARCHITECTURE_REVERSE_ENGINEERING.md`
- `mini-openclaw/ROADMAP.md`
- `mini-openclaw/CODEX_PROMPTS.md`
- `mini-openclaw/PRACTICE_TO_BUILD_MAP.md`
- `mini-openclaw/src/`

## 下一步任务

1. 为 `mini-openclaw` 创建独立 package
2. 实现 session key parser / builder 的测试
3. 实现 route matching 的测试
4. 增加一个最小可用的 WebSocket gateway
5. 接一个能够运行本地 agent turn 的 CLI 命令
6. 增加 provider abstraction 和一条 fallback 路径

## 复用策略

从零重建：

- routing
- session keying
- gateway protocol
- agent runtime
- tool registry
- provider fallback

复用或强改上游思路：

- hybrid retrieval scoring
- plugin manifest 结构
- skill loading 模式
- auth profile cooldown 语义

强力简化：

- 渠道数量
- 远程运维
- UI
- onboarding
- packaging
- node / mobile 表面
