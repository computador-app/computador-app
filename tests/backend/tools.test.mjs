import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  HostRuntime,
  ToolService,
  MAX_BYTES,
} from "../../dist-electron/backend/tools.js";
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "computador-tools-"));
  const root = path.join(dir, "root");
  await fs.mkdir(root);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, root, host: new HostRuntime(root) };
}
test("files cannot escape workspace, including symlinks and missing children", async (t) => {
  const { dir, root, host } = await fixture(t);
  await fs.writeFile(path.join(dir, "outside"), "secret");
  await fs.symlink(dir, path.join(root, "escape"));
  await assert.rejects(host.read("../outside"));
  await assert.rejects(host.read("escape/outside"));
  await assert.rejects(
    host.write("escape/new", "x", new AbortController().signal),
  );
  await assert.rejects(host.read("/etc/passwd"));
});
test("edits reject ambiguity, writes create directories, searches are literal and reads truncate", async (t) => {
  const { root, host } = await fixture(t);
  const tools = new ToolService(host);
  const signal = new AbortController().signal;
  await tools.execute(
    "write_file",
    { path: "nested/a.txt", content: "abc abc" },
    signal,
  );
  await assert.rejects(
    tools.execute(
      "edit_file",
      { path: "nested/a.txt", oldText: "abc", newText: "x" },
      signal,
    ),
    /exactly once/,
  );
  await tools.execute(
    "edit_file",
    { path: "nested/a.txt", oldText: "abc abc", newText: "hello" },
    signal,
  );
  assert.equal(await host.read("nested/a.txt"), "hello");
  assert.match(
    await tools.execute("search_files", { query: "hello" }, signal),
    /nested\/a.txt:1/,
  );
  await fs.writeFile(path.join(root, "large"), "a".repeat(MAX_BYTES + 10));
  assert.match(await host.read("large"), /truncated/);
  await assert.rejects(
    tools.execute("read_file", { path: 42 }, signal),
    /Invalid/,
  );
});
test("shell captures stdout, stderr and exit code; timeout and cancellation terminate", async (t) => {
  const { host } = await fixture(t);
  const tools = new ToolService(host, 100);
  const signal = new AbortController().signal;
  assert.match(
    await tools.execute(
      "run_shell",
      { command: "echo hello; echo err >&2; exit 3" },
      signal,
    ),
    /hello[\s\S]*stderr[\s\S]*exit 3/,
  );
  const result = await tools.execute(
    "run_shell",
    { command: "sleep 20" },
    signal,
  );
  assert.match(result, /timeout/);
  const controller = new AbortController();
  const pending = new ToolService(host).execute(
    "run_shell",
    { command: "sleep 20" },
    controller.signal,
  );
  setTimeout(() => controller.abort(), 50);
  assert.match(await pending, /cancelled/);
});

test(
  "cancellation waits for descendants that ignore SIGTERM",
  { skip: process.platform === "win32" },
  async (t) => {
    const { root, host } = await fixture(t);
    const controller = new AbortController();
    const pending = new ToolService(host).execute(
      "run_shell",
      {
        command:
          "(trap '' TERM; while :; do echo x >> heartbeat; sleep 0.02; done) & wait",
      },
      controller.signal,
    );
    const heartbeat = path.join(root, "heartbeat");
    for (let i = 0; i < 100; i++) {
      if (await fs.stat(heartbeat).catch(() => false)) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    controller.abort();
    await pending;
    const before = (await fs.stat(heartbeat)).size;
    await new Promise((r) => setTimeout(r, 100));
    assert.equal((await fs.stat(heartbeat)).size, before);
  },
);
