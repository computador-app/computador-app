import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect } from "@playwright/test";

const root = await mkdtemp(join(tmpdir(), "computador-agents-e2e-"));
const userData = join(root, "data");
const project = join(root, "project");
await mkdir(project);
const desktop = await electron.launch({
  args: ["."],
  env: {
    ...process.env,
    NODE_ENV: "test",
    COMPUTADOR_TEST_USER_DATA: userData,
    COMPUTADOR_TEST_WORKSPACE: project,
    COMPUTADOR_FAKE_LLM: "1",
  },
});
try {
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(10_000);
  await page.locator("#root > *").waitFor();
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Configurações" });
  await settings.getByRole("tab", { name: "Agentes", exact: true }).click();
  await expect(settings.locator(".agent-list")).toContainText("Computador");

  await settings.locator(".agent-list section").nth(0).getByRole("button", { name: "Novo agente" }).click();
  const form = settings.locator(".agent-form");
  await form.getByLabel("Nome", { exact: true }).fill("Writer");
  await form.getByLabel("Descrição curta", { exact: true }).fill("Escreve textos claros.");
  await form.getByLabel("System prompt", { exact: true }).fill("Escreva com clareza.");
  await form.getByRole("button", { name: "Salvar agente", exact: true }).click();
  await expect(settings.locator(".agent-list")).toContainText("Writer");
  assert.match(
    await readFile(join(userData, ".computador", "agents", "writer.yaml"), "utf8"),
    /id: writer/,
  );

  await settings.locator(".agent-list section").nth(1).getByRole("button", { name: "Novo agente" }).click();
  await form.getByLabel("Nome", { exact: true }).fill("Project Reviewer");
  await form.getByLabel("Descrição curta", { exact: true }).fill("Revisa este projeto.");
  await form.getByLabel("System prompt", { exact: true }).fill("Revise o projeto.");
  await form.getByRole("button", { name: "Salvar agente", exact: true }).click();
  assert.match(
    await readFile(join(project, ".computador", "agents", "project-reviewer.yaml"), "utf8"),
    /id: project-reviewer/,
  );

  const snapshot = await page.evaluate(() => window.desktop.backend.snapshot());
  assert.ok(snapshot.agents.some((agent) => agent.ref === "user:writer"));
  assert.ok(snapshot.agents.some((agent) => agent.ref === "project:project-reviewer"));
  await settings.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
  await page.getByLabel("Agente da conversa").selectOption("project:project-reviewer");
  assert.equal(
    await page.evaluate(async () => {
      const state = await window.desktop.backend.snapshot();
      return state.sessions.find((session) => session.id === state.activeSessionId).agentRef;
    }),
    "project:project-reviewer",
  );
  console.log("Electron agents E2E passed: user/project YAML CRUD and session selection.");
} finally {
  await desktop.close();
  await rm(root, { recursive: true, force: true });
}
