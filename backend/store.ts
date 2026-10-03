import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { ChatSession, WorkspaceInfo } from "../src/shared/protocol.js";
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY, path TEXT UNIQUE NOT NULL, name TEXT NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, position INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS transcripts(session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE, version INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, status TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER);
      CREATE TABLE IF NOT EXISTS tool_runs(id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS providers(id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS credentials(id TEXT PRIMARY KEY, encrypted BLOB NOT NULL);
      INSERT OR IGNORE INTO migrations VALUES(1);`);
    for (const session of this.sessions())
      if (session.status === "running") {
        session.status = "interrupted";
        session.error = "Execução interrompida / Run interrupted";
        session.messages.forEach((m) => {
          if (m.tool?.status === "running") {
            m.tool.status = "failed";
            m.tool.result = "Interrupted";
          }
        });
        this.saveSession(session);
      }
    this.db.exec(
      "UPDATE runs SET status='interrupted', ended=unixepoch()*1000 WHERE status='running'",
    );
  }
  get<T>(key: string, fallback: T): T {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key=?")
      .get(key);
    return row ? JSON.parse(row.value as string) : fallback;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO settings VALUES(?,?)")
      .run(key, JSON.stringify(value));
  }
  workspaces(): WorkspaceInfo[] {
    return this.db
      .prepare("SELECT id,path,name FROM workspaces ORDER BY updated DESC")
      .all() as unknown as WorkspaceInfo[];
  }
  workspace(path: string, name: string) {
    const id =
      this.workspaces().find((w) => w.path === path)?.id ?? randomUUID();
    this.db
      .prepare(
        "INSERT INTO workspaces VALUES(?,?,?,?) ON CONFLICT(path) DO UPDATE SET updated=excluded.updated",
      )
      .run(id, path, name, Date.now());
    return { id, path, name };
  }
  sessions(): ChatSession[] {
    return this.db
      .prepare("SELECT data FROM sessions")
      .all()
      .map((row) => {
        const s = JSON.parse(row.data as string) as ChatSession;
        s.messages = this.db
          .prepare(
            "SELECT data FROM messages WHERE session_id=? ORDER BY position",
          )
          .all(s.id)
          .map((m) => JSON.parse(m.data as string));
        return s;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  saveSession(session: ChatSession) {
    this.db.exec("BEGIN");
    try {
      this.db
        .prepare(
          "INSERT INTO sessions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(
          session.id,
          session.workspaceId,
          JSON.stringify({ ...session, messages: [] }),
        );
      const write = this.db.prepare(
        "INSERT INTO messages VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      );
      session.messages.forEach((m, i) =>
        write.run(m.id, session.id, i, JSON.stringify(m)),
      );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  transcript(id: string): unknown[] {
    const row = this.db
      .prepare("SELECT data,version FROM transcripts WHERE session_id=?")
      .get(id);
    if (row && row.version !== 1)
      throw new Error("Unsupported transcript version");
    return row ? JSON.parse(row.data as string) : [];
  }
  saveTranscript(id: string, data: unknown[]) {
    this.db
      .prepare("INSERT OR REPLACE INTO transcripts VALUES(?,1,?)")
      .run(id, JSON.stringify(data));
  }
  deleteSession(id: string) {
    this.db.prepare("DELETE FROM sessions WHERE id=?").run(id);
  }
  close() {
    this.db.close();
  }
}
