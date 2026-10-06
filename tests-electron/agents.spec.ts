import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "./fixture";

test("user and project agents persist as YAML and can be selected", async ({
  appWindow: page,
  rootDir,
  projectDir,
}) => {
  await page.getByRole("button", { name: "Abrir pasta", exact: true }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Configurações" });
  await settings.getByRole("tab", { name: "Agentes", exact: true }).click();
  await settings.locator(".agent-list section").nth(0).getByRole("button", { name: "Novo agente" }).click();
  const form = settings.locator(".agent-form");
  await form.getByLabel("Nome", { exact: true }).fill("Writer");
  await form.getByLabel("Descrição curta", { exact: true }).fill("Escreve textos claros.");
  await form.getByLabel("System prompt", { exact: true }).fill("Escreva com clareza.");
  await form.getByRole("button", { name: "Salvar agente", exact: true }).click();
  await expect(settings.locator(".agent-list")).toContainText("Writer");
  expect(await readFile(join(rootDir, "data", ".computador", "agents", "writer.yaml"), "utf8")).toContain("id: writer");

  await settings.locator(".agent-list section").nth(1).getByRole("button", { name: "Novo agente" }).click();
  await form.getByLabel("Nome", { exact: true }).fill("Project Reviewer");
  await form.getByLabel("Descrição curta", { exact: true }).fill("Revisa este projeto.");
  await form.getByLabel("System prompt", { exact: true }).fill("Revise o projeto.");
  await form.getByRole("button", { name: "Salvar agente", exact: true }).click();
  expect(await readFile(join(projectDir, ".computador", "agents", "project-reviewer.yaml"), "utf8")).toContain("id: project-reviewer");
  await settings.getByRole("button", { name: "Concluído", exact: true }).click();
  await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
  await page.getByLabel("Agente da conversa").selectOption("project:project-reviewer");
  const state = await page.evaluate(() => globalThis.desktop.backend.snapshot());
  expect(state.sessions.find((session) => session.id === state.activeSessionId)?.agentRef).toBe("project:project-reviewer");
});
