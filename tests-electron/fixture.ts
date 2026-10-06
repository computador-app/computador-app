import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  _electron as electron,
  expect,
  test as base,
  type ElectronApplication,
  type Page,
} from "@playwright/test";

export async function launchDesktop(rootDir: string, projectDir: string) {
  const app = await electron.launch({
    args: ["."],
    timeout: 30_000,
    env: {
      ...process.env,
      NODE_ENV: "test",
      COMPUTADOR_TEST_USER_DATA: join(rootDir, "data"),
      COMPUTADOR_TEST_WORKSPACE: projectDir,
      COMPUTADOR_FAKE_LLM: "1",
    },
  });
  const window = await app.firstWindow();
  window.setDefaultTimeout(10_000);
  await window.waitForLoadState("domcontentloaded");
  await window.locator("#root > *").first().waitFor();
  return { app, window };
}

type Fixtures = {
  rootDir: string;
  projectDir: string;
  electronApp: ElectronApplication;
  appWindow: Page;
};

export const test = base.extend<Fixtures>({
  rootDir: async ({}, use) => {
    const root = await mkdtemp(join(tmpdir(), "computador-electron-test-"));
    await use(root);
    await rm(root, { recursive: true, force: true });
  },
  projectDir: async ({ rootDir }, use) => {
    const project = join(rootDir, "project");
    await mkdir(project);
    await use(project);
  },
  electronApp: async ({ rootDir, projectDir }, use) => {
    const { app } = await launchDesktop(rootDir, projectDir);
    await use(app);
    await app.close().catch(() => {});
  },
  appWindow: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();
    window.setDefaultTimeout(10_000);
    await window.locator("#root > *").first().waitFor();
    await use(window);
  },
});

export { expect };
