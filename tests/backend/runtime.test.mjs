import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store } from "../../dist-electron/backend/store.js";
import { Application } from "../../dist-electron/backend/application.js";
import { FakeLLMService } from "../../dist-electron/backend/fake-llm.js";
import { Credentials } from "../../dist-electron/backend/credentials.js";
import { PiAILLMService } from "../../dist-electron/backend/pi-ai.js";
import { dispatch } from "../../dist-electron/backend/ipc.js";
const key = { provider: "test", modelId: "fast" };
async function fixture(t, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "computador-test-"));
  const root = path.join(dir, "project");
  await fs.mkdir(root);
  const store = new Store(path.join(dir, "db.sqlite"));
  store.set("fake-connected", true);
  const llm = new FakeLLMService(store);
  const app = new Application(store, llm, {
    secureStorage: () => false,
    openFolder: async () => root,
    openExternal: async () => {},
    ...options,
  });
  await app.init();
  await app.openWorkspace();
  await app.setDefault(key);
  t.after(async () => {
    await app.close();
    await fs.rm(dir, { recursive: true, force: true });
  });
  return { dir, root, store, llm, app };
}
async function finished(app, id) {
  for (let i = 0; i < 200; i++) {
    if (app.snapshot().sessions.find((s) => s.id === id).status !== "running")
      return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("Run never finished");
}
test("persistent sessions, tools, default snapshots and presentation-only exclusions", async (t) => {
  const { app, root, store } = await fixture(t);
  const id = app.createSession();
  app.setHidden([JSON.stringify(["test", "fast"])], true);
  assert.deepEqual(app.snapshot().defaultModel, key);
  assert.deepEqual(app.snapshot().sessions[0].model, key);
  await app.sendMessage(id, "tools", "en");
  await finished(app, id);
  const s = app.snapshot().sessions.find((s) => s.id === id);
  assert.equal(s.status, "completed");
  assert.equal(s.messages.filter((m) => m.tool).length, 3);
  assert.equal(
    await fs.readFile(path.join(root, "agent-test.txt"), "utf8"),
    "hello",
  );
  assert.match(
    s.messages.find((m) => m.tool?.name === "run_shell").tool.result,
    /shell-ok/,
  );
  assert.equal(
    store.sessions().find((s) => s.id === id).messages.length,
    s.messages.length,
  );
  assert.ok(store.transcript(id).length >= 6);
  await app.setDefault({ provider: "test", modelId: "reasoning" });
  assert.deepEqual(s.model, key);
  const next = app.createSession();
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === next)?.model.modelId,
    "reasoning",
  );
});
test("thinking levels and image inputs follow model capabilities", async (t) => {
  const { app, store } = await fixture(t);
  const reasoning = { provider: "test", modelId: "reasoning" };
  await app.setDefault(reasoning, "high");
  assert.equal(app.snapshot().defaultThinkingLevel, "high");
  const reasoningSession = app.createSession();
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === reasoningSession)
      .thinkingLevel,
    "high",
  );
  app.updateSession(reasoningSession, { thinkingLevel: "low" });
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === reasoningSession)
      .thinkingLevel,
    "low",
  );
  assert.throws(
    () => app.updateSession(reasoningSession, { thinkingLevel: "max" }),
    /unavailable/i,
  );

  await app.setDefault(key, "off");
  const imageSession = app.createSession();
  const image = {
    name: "pixel.png",
    mimeType: "image/png",
    data: "iVBORw0KGgo=",
  };
  await app.sendMessage(imageSession, "Describe", "en", [image]);
  await finished(app, imageSession);
  const saved = app.snapshot().sessions.find((s) => s.id === imageSession);
  assert.deepEqual(saved.messages[0].images, [image]);
  assert.deepEqual(store.transcript(imageSession)[0].images, [image]);

  await assert.rejects(
    app.sendMessage(reasoningSession, "Describe", "en", [image]),
    /does not accept images/i,
  );
});
test("cancel preserves partial output, switching sessions does not cancel, deletion cancels", async (t) => {
  const { app } = await fixture(t);
  const id = app.createSession();
  await app.sendMessage(id, "slow", "en");
  app.createSession();
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === id).status,
    "running",
  );
  await app.cancelRun(id);
  const s = app.snapshot().sessions.find((s) => s.id === id);
  assert.equal(s.status, "cancelled");
  assert.equal(s.messages.at(-1).incomplete, true);
  assert.ok(s.messages.at(-1).text);
  await app.sendMessage(id, "slow", "en");
  await app.deleteSession(id);
  assert.ok(!app.snapshot().sessions.some((s) => s.id === id));
});
test("run concurrency, tool limits, timeout and IPC validation", async (t) => {
  const { app } = await fixture(t, { maxTools: 1, runTimeout: 1500 });
  const id = app.createSession();
  await app.sendMessage(id, "tools", "en");
  await finished(app, id);
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === id).status,
    "failed",
  );
  assert.match(
    app.snapshot().sessions.find((s) => s.id === id).error,
    /limit/i,
  );
  const ids = [];
  for (let i = 0; i < 4; i++) {
    const id = app.createSession();
    ids.push(id);
    await app.sendMessage(id, "slow", "en");
  }
  await assert.rejects(app.sendMessage(ids[0], "again", "en"), /active/);
  await assert.rejects(app.sendMessage(app.createSession(), "x", "en"), /Four/);
  await assert.rejects(dispatch(app, "readFile", [42]), /Invalid/);
  await assert.rejects(dispatch(app, "__proto__", []), /Unknown/);
  await assert.rejects(
    dispatch(app, "updateSession", [id, { workspaceId: "other" }]),
    /Invalid/,
  );
  await Promise.all(ids.map((id) => app.cancelRun(id)));
});
test("credentials serialize refresh and deletion; plaintext is not stored", async (t) => {
  const { store } = await fixture(t);
  const encryption = {
    available: () => true,
    encrypt: (s) => Buffer.from(s).map((v) => v ^ 0x5a),
    decrypt: (b) =>
      Buffer.from(b)
        .map((v) => v ^ 0x5a)
        .toString(),
  };
  const credentials = new Credentials(store, encryption);
  await credentials.modify("x", async () => ({
    type: "oauth",
    access: "secret",
    refresh: "refresh",
    expires: 0,
    count: 0,
  }));
  await Promise.all(
    Array.from({ length: 10 }, () =>
      credentials.modify("x", async (c) => {
        await new Promise((r) => setTimeout(r, 2));
        return { ...c, count: c.count + 1 };
      }),
    ),
  );
  assert.equal((await credentials.read("x")).count, 10);
  assert.ok(
    !Buffer.from(
      store.db.prepare("SELECT encrypted FROM credentials WHERE id=?").get("x")
        .encrypted,
    ).includes("secret"),
  );
  assert.deepEqual(await credentials.list(), [
    { providerId: "x", type: "oauth" },
  ]);
  await credentials.delete("x");
  assert.equal(await credentials.read("x"), undefined);
  const memory = new Credentials(store, {
    available: () => false,
    encrypt: () => {
      throw Error();
    },
    decrypt: () => {
      throw Error();
    },
  });
  await memory.modify("m", async () => ({ type: "api_key", key: "secret" }));
  assert.equal(
    store.db.prepare("SELECT * FROM credentials WHERE id=?").get("m"),
    undefined,
  );
});
test("auth prompts do not expose submitted secrets and can be cancelled", async (t) => {
  const { app } = await fixture(t);
  await app.login("test", "api_key");
  await new Promise((r) => setTimeout(r, 10));
  const prompt = app.snapshot().auth.prompt;
  app.answerAuth(prompt.id, "ultra-secret");
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(!JSON.stringify(app.snapshot()).includes("ultra-secret"));
  await app.login("test", "oauth");
  await new Promise((r) => setTimeout(r, 10));
  await app.cancelAuth();
  assert.equal(app.snapshot().auth, null);
});
test("real SDK catalog initializes without credentials or network requests", async (t) => {
  const { store } = await fixture(t);
  const credentials = new Credentials(store, {
    available: () => false,
    encrypt: () => new Uint8Array(),
    decrypt: () => "",
  });
  const llm = new PiAILLMService(credentials, store);
  const catalog = await llm.catalog();
  assert.ok(catalog.providers.length > 10);
  assert.equal(catalog.models.length, 0);
  assert.ok(
    catalog.providers.some((p) => p.methods.some((m) => m.type === "oauth")),
  );
});
test("startup marks incomplete runs interrupted and preserves completed tool results", async () => {
  const store = new Store(":memory:");
  const w = store.workspace("/tmp", "tmp");
  const session = {
    id: "s",
    workspaceId: w.id,
    title: "",
    model: key,
    messages: [],
    status: "running",
    updatedAt: 1,
  };
  store.saveSession(session);
  // File-backed reopening tests actual startup migration/recovery.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "computador-recovery-"));
  const file = path.join(dir, "db");
  let db = new Store(file);
  db.workspace("/tmp", "tmp");
  const actual = db.workspaces()[0];
  db.saveSession({ ...session, workspaceId: actual.id });
  db.close();
  db = new Store(file);
  assert.equal(db.sessions()[0].status, "interrupted");
  assert.equal(
    db.db.prepare("SELECT count(*) AS n FROM migrations").get().n,
    1,
  );
  db.close();
  store.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test("workspace identity is canonical and session histories remain separate", async (t) => {
  const { app, root, store, dir } = await fixture(t);
  const first = app.createSession();
  app.updateSession(first, { title: "First folder" });
  const other = path.join(dir, "other");
  await fs.mkdir(other);
  const otherWorkspace = store.workspace(await fs.realpath(other), "other");
  await app.openWorkspace(otherWorkspace.id);
  assert.equal(app.snapshot().activeSessionId, "");
  const second = app.createSession();
  assert.notEqual(
    app.snapshot().sessions.find((s) => s.id === first).workspaceId,
    app.snapshot().sessions.find((s) => s.id === second).workspaceId,
  );
  const canonicalRoot = await fs.realpath(root);
  const firstWorkspace = store.workspaces().find(
    (w) => w.path === canonicalRoot,
  );
  await app.openWorkspace(firstWorkspace.id);
  assert.equal(app.snapshot().activeSessionId, first);
  assert.equal(store.workspaces().length, 2);
});
test("timeout ends a run and provider removal cancels active work without losing history", async (t) => {
  const { app } = await fixture(t, { runTimeout: 50 });
  const id = app.createSession();
  await app.sendMessage(id, "slow", "en");
  await finished(app, id);
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === id).status,
    "failed",
  );
  assert.match(
    app.snapshot().sessions.find((s) => s.id === id).error,
    /timeout/,
  );
  await app.sendMessage(id, "slow", "en");
  await app.removeProvider("test");
  assert.equal(
    app.snapshot().sessions.find((s) => s.id === id).status,
    "cancelled",
  );
  assert.ok(
    app.snapshot().sessions.find((s) => s.id === id).messages.length > 0,
  );
  await assert.rejects(app.sendMessage(id, "again", "en"), /connected/);
});
test("adapter repairs dangling tool calls once and preserves opaque signatures", async (t) => {
  const { store } = await fixture(t);
  const credentials = new Credentials(store, {
    available: () => false,
    encrypt: () => new Uint8Array(),
    decrypt: () => "",
  });
  const llm = new PiAILLMService(credentials, store);
  const assistant = {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "", thinkingSignature: "opaque" },
      { type: "toolCall", id: "a", name: "write_file", arguments: {} },
      { type: "toolCall", id: "b", name: "read_file", arguments: {} },
    ],
  };
  const done = llm.tool(
    { id: "a", name: "write_file", arguments: {} },
    "Written",
    false,
  );
  const repaired = llm.recover([assistant, done]);
  assert.equal(repaired.length, 3);
  assert.equal(repaired[2].toolCallId, "b");
  assert.equal(repaired[2].isError, true);
  assert.equal(repaired[0].content[0].thinkingSignature, "opaque");
  assert.deepEqual(llm.recover(repaired), repaired);
  assert.deepEqual(llm.user("Describe", [{
    name: "pixel.png",
    mimeType: "image/png",
    data: "iVBORw0KGgo=",
  }]).content, [
    { type: "text", text: "Describe" },
    { type: "image", mimeType: "image/png", data: "iVBORw0KGgo=" },
  ]);
});
test("cancelled queued credential mutations do not write, completed refresh rotations persist", async (t) => {
  const { store } = await fixture(t);
  const credentials = new Credentials(store, {
    available: () => false,
    encrypt: () => new Uint8Array(),
    decrypt: () => "",
  });
  let release;
  const latch = new Promise((r) => (release = r));
  const first = credentials.modify("p", async () => {
    await latch;
    return {
      type: "oauth",
      refresh: "rotated",
      access: "access",
      expires: 100,
    };
  });
  const c = new AbortController();
  const second = credentials.modify(
    "p",
    async () => ({ type: "api_key", key: "should-not-write" }),
    { signal: c.signal },
  );
  c.abort();
  release();
  await first;
  await assert.rejects(second);
  assert.equal((await credentials.read("p")).refresh, "rotated");
});
