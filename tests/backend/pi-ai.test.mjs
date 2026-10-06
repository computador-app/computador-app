import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../../dist-electron/backend/store.js";
import { PiAILLMService } from "../../dist-electron/backend/pi-ai.js";

const model = {
  id: "fast",
  name: "Fast",
  provider: "fake",
  api: "fake",
  type: "chat",
  reasoning: false,
  contextWindow: 32_000,
  input: ["text", "image"],
};

function fixture() {
  const store = new Store(":memory:");
  const credentials = { read: async () => ({ token: "secret" }) };
  const service = new PiAILLMService(credentials, store);
  const calls = [];
  const provider = {
    id: "fake",
    name: "Fake provider",
    auth: {
      apiKey: { name: "API key", login: true },
      oauth: { name: "OAuth", loginLabel: "Subscription" },
    },
    getModels: () => [model],
    filterModels: (models, credential) =>
      credential?.token ? models : [],
  };
  const models = {
    refresh: async (options) => {
      calls.push(["refresh", options]);
      return { errors: new Map() };
    },
    getProviders: () => [provider],
    getProvider: (id) => (id === "fake" ? provider : undefined),
    getModel: (providerId, modelId) =>
      providerId === "fake" && modelId === "fast" ? model : undefined,
    checkAuth: async () => true,
    login: async (...args) => calls.push(["login", ...args]),
    logout: async (...args) => calls.push(["logout", ...args]),
    streamSimple: () => {
      throw new Error("stream not configured");
    },
  };
  service.models = models;
  return { store, service, models, calls, provider };
}

const interaction = {
  signal: new AbortController().signal,
  prompt: async () => "answer",
  notify: () => {},
};

function stream(result, events = []) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* events;
    },
    result: async () => result,
  };
}

const completed = (overrides = {}) => ({
  role: "assistant",
  content: [{ type: "text", text: "complete" }],
  stopReason: "stop",
  usage: {
    input: 2,
    output: 3,
    totalTokens: 5,
    cost: { total: 0.01 },
  },
  ...overrides,
});

test("catalog reports configured providers and filtered model capabilities", async (t) => {
  const { store, service, models } = fixture();
  t.after(() => store.close());
  store.db.prepare("INSERT INTO providers VALUES(?,1)").run("fake");
  const catalog = await service.catalog();
  assert.equal(catalog.providers[0].status, "configured");
  assert.deepEqual(
    catalog.providers[0].methods.map((method) => method.type),
    ["api_key", "oauth"],
  );
  assert.deepEqual(catalog.models[0].thinkingLevels, ["off"]);
  assert.deepEqual(catalog.models[0].input, ["text", "image"]);

  models.checkAuth = async () => {
    throw new Error("bad auth");
  };
  const failed = await service.catalog();
  assert.equal(failed.providers[0].status, "error");
  assert.match(failed.providers[0].error, /Authentication failed/);
});

test("login, logout and refresh update provider state and propagate failures", async (t) => {
  const { store, service, models, calls } = fixture();
  t.after(() => store.close());
  await assert.rejects(service.login("missing", "oauth", interaction), /Unknown/);
  await service.login("fake", "oauth", interaction);
  assert.ok(calls.some(([name]) => name === "login"));
  assert.equal(
    store.db.prepare("SELECT enabled FROM providers WHERE id=?").get("fake")
      .enabled,
    1,
  );
  await service.logout("fake");
  assert.equal(
    store.db.prepare("SELECT * FROM providers WHERE id=?").get("fake"),
    undefined,
  );
  models.refresh = async () => ({ errors: new Map([["fake", new Error()]]) });
  await assert.rejects(service.refresh(), /catálogos/);
});

test("stream emits cumulative text and maps transcript, tools and usage", async (t) => {
  const { store, service, models } = fixture();
  t.after(() => store.close());
  store.db.prepare("INSERT INTO providers VALUES(?,1)").run("fake");
  const transcript = completed({
    content: [
      { type: "text", text: "complete" },
      { type: "toolCall", id: "call", name: "read_file", arguments: {} },
    ],
  });
  models.streamSimple = (_model, context, options) => {
    assert.equal(context.systemPrompt, "system");
    assert.equal(options.reasoning, "high");
    assert.equal(options.maxRetries, 0);
    return stream(transcript, [
      { type: "text_delta", delta: "com" },
      { type: "thinking_delta", delta: "ignored" },
      { type: "text_delta", delta: "plete" },
    ]);
  };
  const chunks = [];
  const result = await service.stream(
    { provider: "fake", modelId: "fast" },
    "system",
    [],
    new AbortController().signal,
    "session",
    "high",
    (text) => chunks.push(text),
  );
  assert.deepEqual(chunks, ["com", "complete"]);
  assert.equal(result.text, "complete");
  assert.equal(result.calls[0].name, "read_file");
  assert.deepEqual(result.usage, {
    input: 2,
    output: 3,
    totalTokens: 5,
    cost: 0.01,
  });
});

test("stream rejects disconnected, missing and terminal provider states", async (t) => {
  const { store, service, models } = fixture();
  t.after(() => store.close());
  const ref = { provider: "fake", modelId: "fast" };
  const args = [
    ref,
    "system",
    [],
    new AbortController().signal,
    "session",
    "off",
    () => {},
  ];
  await assert.rejects(service.stream(...args), /disconnected/i);
  store.db.prepare("INSERT INTO providers VALUES(?,1)").run("fake");
  await assert.rejects(
    service.stream({ ...ref, modelId: "missing" }, ...args.slice(1)),
    /indisponível/i,
  );

  for (const [stopReason, errorMessage, pattern] of [
    ["error", "context token limit", /context/i],
    ["error", "upstream unavailable", /provider request failed/i],
    ["aborted", undefined, /cancelled/i],
    ["length", undefined, /output limit/i],
    ["deferred", undefined, /deferred response/i],
    ["pending", undefined, /deferred response/i],
  ]) {
    models.streamSimple = () =>
      stream(completed({ stopReason, errorMessage }));
    await assert.rejects(service.stream(...args), pattern);
  }
});
