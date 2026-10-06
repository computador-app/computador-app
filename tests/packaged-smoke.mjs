import { _electron as electron } from "@playwright/test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const root = process.argv[2] ?? "release";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const target = join(directory, entry.name);
        return entry.isDirectory() ? files(target) : [target];
      }),
    )
  ).flat();
}

const candidates = await files(root);
const executable = candidates.find((file) => {
  const normalized = file.replaceAll("\\", "/");
  if (process.platform === "darwin")
    return normalized.endsWith("/Computador.app/Contents/MacOS/Computador");
  if (process.platform === "win32")
    return normalized.includes("/win-unpacked/") && basename(file) === "Computador.exe";
  return normalized.includes("/linux-unpacked/") && basename(file) === "computador";
});

if (!executable) throw new Error(`Packaged executable not found under ${root}`);
const userData = await mkdtemp(join(tmpdir(), "computador-packaged-smoke-"));
const app = await electron.launch({
  executablePath: executable,
  timeout: 30_000,
  env: {
    ...process.env,
    NODE_ENV: "test",
    COMPUTADOR_TEST_USER_DATA: userData,
    COMPUTADOR_TEST_WORKSPACE: userData,
    COMPUTADOR_FAKE_LLM: "1",
  },
});
try {
  const window = await app.firstWindow();
  await window.locator("#root > *").first().waitFor({ timeout: 20_000 });
  const title = await window.title();
  if (!title.includes("Computador"))
    throw new Error(`Unexpected packaged window title: ${title}`);
  const version = await app.evaluate(({ app }) => app.getVersion());
  const expected = JSON.parse(
    await (await import("node:fs/promises")).readFile("package.json", "utf8"),
  ).version;
  if (version !== expected)
    throw new Error(`Packaged version ${version} does not match ${expected}`);
  console.log(`Packaged smoke passed: ${executable} (${version})`);
} finally {
  await app.close();
  await rm(userData, { recursive: true, force: true });
}
