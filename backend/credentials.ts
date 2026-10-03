import type { Store } from "./store.js";
export interface Encryption {
  available(): boolean;
  encrypt(value: string): Uint8Array;
  decrypt(value: Uint8Array): string;
}
type SecretCredential =
  | {
      type: "api_key";
      key?: string;
      env?: Readonly<Record<string, string>>;
    }
  | {
      type: "oauth";
      refresh: string;
      access: string;
      expires: number;
      [key: string]: unknown;
    };
export class Credentials {
  private memory = new Map<string, SecretCredential>();
  private locks = new Map<string, Promise<unknown>>();
  constructor(
    private store: Store,
    private encryption: Encryption,
  ) {}
  get persistent() {
    return this.encryption.available();
  }
  async read(
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<SecretCredential | undefined> {
    options?.signal?.throwIfAborted();
    if (this.memory.has(id)) return this.memory.get(id);
    const row = this.store.db
      .prepare("SELECT encrypted FROM credentials WHERE id=?")
      .get(id);
    if (!row || !this.persistent) return undefined;
    return JSON.parse(this.encryption.decrypt(row.encrypted as Uint8Array));
  }
  async list(options?: { signal?: AbortSignal }) {
    options?.signal?.throwIfAborted();
    const ids = new Set([
      ...this.memory.keys(),
      ...this.store.db
        .prepare("SELECT id FROM credentials")
        .all()
        .map((r) => r.id as string),
    ]);
    // Metadata comes from settings, without decrypting any stored secret.
    return [...ids].map((providerId) => ({
      providerId,
      type: this.store.get<"api_key" | "oauth">(
        `credential-type:${providerId}`,
        "api_key",
      ),
    }));
  }
  private async locked<T>(id: string, fn: () => Promise<T>) {
    const previous = this.locks.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    this.locks.set(id, next);
    try {
      return await next;
    } finally {
      if (this.locks.get(id) === next) this.locks.delete(id);
    }
  }
  async modify(
    id: string,
    fn: (
      current: SecretCredential | undefined,
    ) => Promise<SecretCredential | undefined>,
    options?: { signal?: AbortSignal },
  ) {
    return this.locked(id, async () => {
      options?.signal?.throwIfAborted();
      const current = await this.read(id, options);
      const next = await fn(current);
      if (next === undefined) return current;
      if (this.persistent)
        this.store.db
          .prepare("INSERT OR REPLACE INTO credentials VALUES(?,?)")
          .run(id, this.encryption.encrypt(JSON.stringify(next)));
      else this.store.db.prepare("DELETE FROM credentials WHERE id=?").run(id);
      this.memory.set(id, next);
      this.store.set(`credential-type:${id}`, next.type);
      return next;
    });
  }
  async delete(id: string, options?: { signal?: AbortSignal }) {
    await this.locked(id, async () => {
      options?.signal?.throwIfAborted();
      this.store.db.prepare("DELETE FROM credentials WHERE id=?").run(id);
      this.memory.delete(id);
    });
  }
}
