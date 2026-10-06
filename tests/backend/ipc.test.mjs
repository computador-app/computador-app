import test from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../../dist-electron/backend/ipc.js";

function application() {
  const calls = [];
  const app = new Proxy(
    {},
    {
      get: (_target, method) => (...args) => {
        calls.push([method, ...args]);
        return method === "snapshot" ? { revision: 1 } : method;
      },
    },
  );
  return { app, calls };
}

const definition = {
  version: 1,
  id: "reviewer",
  name: "Reviewer",
  description: "Reviews changes",
  systemPrompt: "Review carefully",
  model: { provider: "test", modelId: "fast" },
  thinkingLevel: "high",
  runtime: { maxTurns: 5, timeoutSeconds: 60 },
};

test("dispatch routes every supported operation with normalized arguments", async () => {
  const { app, calls } = application();
  const cases = [
    ["snapshot", []],
    ["openWorkspace", []],
    ["openWorkspace", ["workspace"]],
    ["createSession", []],
    ["selectSession", ["s1"]],
    ["deleteSession", ["s1"]],
    [
      "updateSession",
      [
        "s1",
        {
          title: "Title",
          model: { provider: "test", modelId: "fast" },
          thinkingLevel: "medium",
          agentRef: "user:reviewer",
        },
      ],
    ],
    [
      "sendMessage",
      [
        "s1",
        " message ",
        "en",
        [{ name: "pixel.png", mimeType: "image/png", data: "aGVsbG8=" }],
      ],
    ],
    ["cancelRun", ["s1"]],
    ["login", ["test", "api_key"]],
    ["answerAuth", ["prompt", "answer"]],
    ["cancelAuth", []],
    ["removeProvider", ["test"]],
    ["setDefault", [{ provider: "test", modelId: "fast" }, "off"]],
    ["setHidden", [[JSON.stringify(["test", "fast"])], true]],
    ["refreshModels", []],
    [
      "saveAgent",
      [
        {
          scope: "user",
          definition,
          expectedRevision: "revision",
        },
      ],
    ],
    ["deleteAgent", ["user:reviewer"]],
    ["setDefaultAgent", ["user:reviewer"]],
    ["cancelSubagent", ["run-1"]],
    ["listFiles", []],
    ["readFile", ["README.md"]],
  ];
  for (const [method, args] of cases) await dispatch(app, method, args);

  assert.equal(calls.length, cases.length);
  assert.deepEqual(calls.find(([name]) => name === "openWorkspace"), [
    "openWorkspace",
    undefined,
  ]);
  assert.deepEqual(calls.find(([name]) => name === "sendMessage"), [
    "sendMessage",
    "s1",
    "message",
    "en",
    [{ name: "pixel.png", mimeType: "image/png", data: "aGVsbG8=" }],
  ]);
  assert.deepEqual(calls.find(([name]) => name === "saveAgent")[1], {
    scope: "user",
    definition,
    expectedRevision: "revision",
  });
});

test("dispatch rejects malformed envelopes, text, patches and authentication", async () => {
  const { app } = application();
  const invalid = [
    ["snapshot", null],
    ["snapshot", [1, 2, 3, 4, 5]],
    ["selectSession", [42]],
    ["selectSession", ["bad\0id"]],
    ["updateSession", ["s", null]],
    ["updateSession", ["s", { workspaceId: "other" }]],
    ["updateSession", ["s", { model: [] }]],
    ["updateSession", ["s", { thinkingLevel: "extreme" }]],
    ["updateSession", ["s", { agentRef: "admin:root" }]],
    ["login", ["test", "password"]],
    ["setDefault", [{ provider: "test", modelId: "fast" }, "invalid"]],
    ["unknown", []],
  ];
  for (const [method, args] of invalid)
    await assert.rejects(dispatch(app, method, args));
});

test("dispatch enforces message attachment limits and encoding", async () => {
  const { app } = application();
  await assert.rejects(dispatch(app, "sendMessage", ["s", " ", "en"]), /Empty/);
  await assert.rejects(
    dispatch(app, "sendMessage", ["s", "x", "en", "image"]),
    /images/i,
  );
  await assert.rejects(
    dispatch(app, "sendMessage", ["s", "x", "en", Array(5).fill({})]),
    /images/i,
  );
  await assert.rejects(
    dispatch(app, "sendMessage", [
      "s",
      "x",
      "en",
      [{ name: "file.svg", mimeType: "image/svg+xml", data: "eA==" }],
    ]),
    /type/i,
  );
  await assert.rejects(
    dispatch(app, "sendMessage", [
      "s",
      "x",
      "en",
      [{ name: "file.png", mimeType: "image/png", data: "not-base64!" }],
    ]),
    /data/i,
  );
  const huge = "a".repeat(5_000_001);
  await assert.rejects(
    dispatch(app, "sendMessage", [
      "s",
      "",
      "pt",
      Array.from({ length: 4 }, (_, index) => ({
        name: `${index}.png`,
        mimeType: "image/png",
        data: huge,
      })),
    ]),
    /large/i,
  );
});

test("dispatch validates model filters and complete agent definitions", async () => {
  const { app } = application();
  const invalidFilters = [
    ["not-an-array", true],
    [[], "yes"],
    [["not-json"], true],
    [[JSON.stringify(["only-one"])], true],
    [[JSON.stringify(["ok", 2])], true],
  ];
  for (const args of invalidFilters)
    await assert.rejects(dispatch(app, "setHidden", args));

  const invalidAgents = [
    null,
    { scope: "global", definition },
    { scope: "user", definition: { ...definition, version: 2 } },
    { scope: "user", definition: { ...definition, extra: true } },
    {
      scope: "user",
      definition: { ...definition, runtime: { unknownLimit: 1 } },
    },
    {
      scope: "user",
      definition: { ...definition, runtime: { maxTurns: 1.5 } },
    },
    { scope: "user", definition, surprise: true },
  ];
  for (const input of invalidAgents)
    await assert.rejects(dispatch(app, "saveAgent", [input]));
});
