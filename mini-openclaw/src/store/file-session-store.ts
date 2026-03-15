import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionKey, SessionRecord } from "../core/types.js";
import { deterministicSessionId, type SessionStore } from "./session-store.js";

type StoredShape = {
  sessions: SessionRecord[];
};

export class FileSessionStore implements SessionStore {
  private readonly sessions = new Map<SessionKey, SessionRecord>();

  constructor(
    private readonly filePath: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.loadFromDisk();
  }

  get(sessionKey: SessionKey): SessionRecord | undefined {
    return this.sessions.get(sessionKey);
  }

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
    this.persist();
    return created;
  }

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
    this.persist();
    return next;
  }

  list(): SessionRecord[] {
    return [...this.sessions.values()].sort((a, b) => a.sessionKey.localeCompare(b.sessionKey));
  }

  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) {
      return;
    }

    const raw = readFileSync(this.filePath, "utf8");
    if (raw.trim() === "") {
      return;
    }

    const parsed = JSON.parse(raw) as StoredShape;
    for (const record of parsed.sessions ?? []) {
      this.sessions.set(record.sessionKey, record);
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const payload: StoredShape = {
      sessions: this.list(),
    };
    writeFileSync(this.filePath, JSON.stringify(payload, null, 2), "utf8");
  }
}
