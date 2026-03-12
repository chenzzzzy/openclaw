# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenClaw is a multi-channel AI gateway that runs as a personal AI assistant. It connects to messaging channels (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, etc.) and provides a unified AI assistant experience. The Gateway serves as the control plane for sessions, channels, tools, and events.

## Key Development Commands

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run CLI in development (TypeScript directly via tsx)
pnpm openclaw <command>

# Development with auto-reload
pnpm gateway:watch

# Type checking
pnpm tsgo

# Lint and format
pnpm check           # lint + format check
pnpm format:fix      # auto-fix formatting
pnpm lint:fix        # auto-fix lint issues

# Tests
pnpm test                    # unit tests (vitest)
pnpm test:coverage           # with coverage
pnpm test:e2e               # e2e tests
pnpm test -- <file.pattern> # run specific tests

# UI development
pnpm ui:build
pnpm ui:dev
```

## Architecture

### Core Subsystems

- **Gateway** (`src/gateway/`): WebSocket control plane at `ws://127.0.0.1:18789` for clients, tools, and events
- **CLI** (`src/cli/`, `src/commands/`): Commander-based CLI surface with all user commands
- **Channels** (`src/telegram/`, `src/discord/`, `src/slack/`, etc.): Messaging platform integrations
- **Agent Runtime** (`src/agents/`): Pi agent RPC mode with tool streaming
- **Sessions** (`src/sessions/`): Session model with `main` for direct chats, group isolation
- **Plugins/Extensions** (`extensions/`, `src/plugin-sdk/`): Workspace packages for channel plugins

### Entry Points

- `src/index.ts`: Main entry, exports key utilities
- `src/entry.ts`: CLI entry point, sets up global handlers and Commander program
- `src/cli/program.js`: Builds the CLI command tree

### Key Directories

- `src/`: Source code (TypeScript/ESM)
- `extensions/`: Plugin packages (channel extensions like msteams, matrix, zalo)
- `apps/`: Native apps (macOS, iOS, Android)
- `docs/`: Documentation (Mintlify)
- `ui/`: Web UI (Control UI, WebChat)

### Plugin SDK

Extensions use `openclaw/plugin-sdk` for channel integration. Plugin deps must be in the extension's `package.json`, not root. Plugins install with `npm install --omit=dev` at runtime.

## Configuration

Config file: `~/.openclaw/openclaw.json` (JSON5 format)

Key config areas:
- `agent.model`: Default model (e.g., `anthropic/claude-opus-4-6`)
- `channels.*`: Channel-specific config (telegram, discord, slack, etc.)
- `gateway.*`: Gateway settings (port, bind, auth, tailscale)

## Runtime Requirements

- Node.js 22+
- pnpm 10.x (primary), Bun optional for dev
- TypeScript ESM modules

## Detailed Guidelines

See `AGENTS.md` for comprehensive development guidelines including:
- Coding style and naming conventions
- Testing guidelines and coverage thresholds
- Commit and PR workflows
- Security considerations
- Platform-specific notes (macOS, iOS, Android)
- Release process