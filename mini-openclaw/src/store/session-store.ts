import { createHash } from "node:crypto";
import type { SessionKey, SessionRecord } from "../core/types.js";

export type SessionStore = {
  get(sessionKey: SessionKey): SessionRecord | undefined;
  getOrCreate(sessionKey: SessionKey): SessionRecord;
  upsert(
    sessionKey: SessionKey,
    patch: Partial<Omit<SessionRecord, "sessionKey" | "sessionId">>,
  ): SessionRecord;
  list(): SessionRecord[];
};

/**
 * 根据 sessionKey 生成稳定的会话 ID。
 * @param sessionKey 会话 key。
 * @returns 返回固定前缀的短哈希 sessionId（相同 key 恒定相同）。
 */
export function deterministicSessionId(sessionKey: SessionKey): string {
  const digest = createHash("sha256").update(sessionKey).digest("hex");
  return `sess_${digest.slice(0, 16)}`;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<SessionKey, SessionRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * 按 key 查询会话记录。
   * @param sessionKey 会话 key。
   * @returns 命中时返回会话记录，未命中返回 undefined。
   */
  get(sessionKey: SessionKey): SessionRecord | undefined {
    return this.sessions.get(sessionKey);
  }

  /**
   * 获取会话，不存在则创建。
   * @param sessionKey 会话 key。
   * @returns 返回已存在或新建的会话记录。
   */
  getOrCreate(sessionKey: SessionKey): SessionRecord {
    const existing = this.sessions.get(sessionKey);
    if (existing) {
      return existing;
    }

    const created: SessionRecord = {
      sessionKey,
      sessionId: deterministicSessionId(sessionKey),
      updatedAt: this.now(),
    };
    this.sessions.set(sessionKey, created);
    return created;
  }

  /**
   * 更新或插入会话记录。
   * @param sessionKey 会话 key。
   * @param patch 允许更新的字段补丁（不含 sessionKey/sessionId）。
   * @returns 返回更新后的会话记录。
   */
  upsert(
    sessionKey: SessionKey,
    patch: Partial<Omit<SessionRecord, "sessionKey" | "sessionId">>,
  ): SessionRecord {
    const base = this.getOrCreate(sessionKey);
    const next: SessionRecord = {
      ...base,
      ...patch,
      updatedAt: patch.updatedAt ?? this.now(),
    };
    this.sessions.set(sessionKey, next);
    return next;
  }

  /**
   * 列出全部会话记录（按 sessionKey 排序）。
   * @returns 返回会话记录数组。
   */
  list(): SessionRecord[] {
    return [...this.sessions.values()].sort((a, b) => a.sessionKey.localeCompare(b.sessionKey));
  }
}
