import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store } from "../../dist-electron/backend/store.js";
import { AgentManager } from "../../dist-electron/backend/agents.js";

async function fixture(t, before) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "computador-agents-"));
  const directory = path.join(root, "home", ".computador", "agents");
  await fs.mkdir(directory, { recursive: true });
  await before?.({ root, directory });
  const store = new Store(path.join(root, "db.sqlite"));
  const manager = new AgentManager(
    store,
    directory,
    () => {},
    (file) => fs.unlink(file),
    () => false,
    false,
  );
  await manager.init();
  t.after(async () => {
    await manager.close();
    store.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, directory, store, manager };
}

test("creates a valid personal agent and protects the last user agent", async (t) => {
  const { directory, manager } = await fixture(t);
  const [agent] = manager.list();
  assert.equal(agent.ref, "user:personal");
  assert.equal(agent.name, "Computador");
  assert.match(await fs.readFile(path.join(directory, "personal.yaml"), "utf8"), /system_prompt:/);
  await assert.rejects(manager.delete(agent.ref), /Pelo menos um/);
});

test("keeps invalid files visible, creates a free fallback id and preserves comments", async (t) => {
  const { directory, manager } = await fixture(t, async ({ directory }) => {
    await fs.writeFile(path.join(directory, "personal.yaml"), "version: nope\n");
  });
  assert.equal(manager.errors().length, 1);
  assert.equal(manager.list()[0].ref, "user:personal-2");
  const source = `# keep me\nversion: 1\nid: writer\nname: Writer\ndescription: Writes clearly.\nsystem_prompt: |\n  Be clear.\n`;
  await fs.writeFile(path.join(directory, "writer.yaml"), source);
  await manager.setWorkspace();
  const writer = manager.list().find((agent) => agent.id === "writer");
  await manager.save(
    "user",
    { ...manager.get(writer.ref), name: "Senior Writer" },
    writer.revision,
  );
  assert.match(await fs.readFile(writer.path, "utf8"), /^# keep me/m);
  await assert.rejects(
    manager.save("user", { ...manager.get(writer.ref), name: "Stale" }, writer.revision),
    /mudou no disco/,
  );
});
