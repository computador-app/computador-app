const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const electronExecutable = require("electron");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed: ${result.stderr || result.stdout || result.error}`,
    );
  }
}

function setPlistValue(plist, key, value) {
  const plistBuddy = "/usr/libexec/PlistBuddy";
  const update = spawnSync(plistBuddy, ["-c", `Set :${key} ${value}`, plist], {
    encoding: "utf8",
  });
  if (update.status === 0) return;
  run(plistBuddy, ["-c", `Add :${key} string ${value}`, plist]);
}

function prepareMacDevBundle() {
  const electronVersion = require("electron/package.json").version;
  const bundleRevision = "5";
  const sourceBundle = path.resolve(electronExecutable, "../../..");
  const cacheRoot = path.join(
    projectRoot,
    "node_modules",
    ".cache",
    `computador-electron-${electronVersion}`,
  );
  const targetBundle = path.join(cacheRoot, "Computador.app");
  const stamp = path.join(cacheRoot, ".ready");

  if (
    !fs.existsSync(stamp) ||
    fs.readFileSync(stamp, "utf8") !== `${electronVersion}:${bundleRevision}`
  ) {
    fs.rmSync(cacheRoot, { recursive: true, force: true });
    fs.mkdirSync(cacheRoot, { recursive: true });

    // -c uses APFS copy-on-write, so the development bundle takes almost no
    // additional disk space while keeping node_modules/electron untouched.
    run("/bin/cp", ["-cR", sourceBundle, targetBundle]);

    const plist = path.join(targetBundle, "Contents", "Info.plist");
    setPlistValue(plist, "CFBundleName", "Computador");
    setPlistValue(plist, "CFBundleDisplayName", "Computador");
    setPlistValue(plist, "CFBundleIdentifier", "app.computador.dev");
    setPlistValue(plist, "CFBundleExecutable", "Computador");
    setPlistValue(plist, "CFBundleIconFile", "computador.icns");
    fs.copyFileSync(
      path.join(projectRoot, "assets", "computador.icns"),
      path.join(targetBundle, "Contents", "Resources", "computador.icns"),
    );
    fs.renameSync(
      path.join(targetBundle, "Contents", "MacOS", "Electron"),
      path.join(targetBundle, "Contents", "MacOS", "Computador"),
    );
    run("/usr/bin/codesign", [
      "--force",
      "--deep",
      "--sign",
      "-",
      targetBundle,
    ]);
    fs.writeFileSync(stamp, `${electronVersion}:${bundleRevision}`);
  }

  return path.join(targetBundle, "Contents", "MacOS", "Computador");
}

function launch() {
  const executable =
    process.platform === "darwin" ? prepareMacDevBundle() : electronExecutable;
  const child = spawn(executable, [projectRoot, ...process.argv.slice(2)], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 0 : 1);
  });
}

if (require.main === module) launch();

module.exports = { prepareMacDevBundle };
