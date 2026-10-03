import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
export const MAX_BYTES = 1024 * 1024;
const truncated = "\n[truncated / truncado]";
export function clip(value: string) {
  const bytes = Buffer.from(value);
  return bytes.length > MAX_BYTES
    ? bytes.subarray(0, MAX_BYTES).toString("utf8") + truncated
    : value;
}
const object = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const string = { type: "string" };
export const toolDefinitions = [
  {
    name: "list_files",
    description:
      "List files in the workspace, excluding .git and node_modules.",
    parameters: object({ path: string }, []),
  },
  {
    name: "read_file",
    description: "Read a UTF-8 workspace file (up to 1 MiB).",
    parameters: object({ path: string }, ["path"]),
  },
  {
    name: "search_files",
    description: "Find literal text in workspace files.",
    parameters: object({ query: string, path: string }, ["query"]),
  },
  {
    name: "write_file",
    description: "Create or replace a UTF-8 file inside the workspace.",
    parameters: object({ path: string, content: string }, ["path", "content"]),
  },
  {
    name: "edit_file",
    description: "Replace exactly one occurrence of oldText with newText.",
    parameters: object({ path: string, oldText: string, newText: string }, [
      "path",
      "oldText",
      "newText",
    ]),
  },
  {
    name: "run_shell",
    description:
      "Execute a shell command from the workspace. No interactive input. Timeout 120 seconds.",
    parameters: object({ command: string }, ["command"]),
  },
];
export class HostRuntime {
  constructor(readonly root: string) {}
  async resolve(input = ".", writing = false): Promise<string> {
    const root = await fs.realpath(this.root);
    const candidate = path.resolve(root, input);
    const inside = (p: string) => p === root || p.startsWith(root + path.sep);
    if (!inside(candidate)) throw new Error("Path outside workspace");
    let probe = candidate;
    while (true) {
      try {
        const resolved = await fs.realpath(probe);
        if (!inside(resolved)) throw new Error("Symlink outside workspace");
        // Return canonical target so writes do not replace an in-workspace symlink.
        return path.join(resolved, path.relative(probe, candidate));
      } catch (e) {
        if (
          !writing ||
          (e as NodeJS.ErrnoException).code !== "ENOENT" ||
          probe === root
        )
          throw e;
        // Reject dangling symlinks rather than treating them as missing directories.
        const stat = await fs.lstat(probe).catch(() => null);
        if (stat?.isSymbolicLink()) throw new Error("Dangling symlink");
        probe = path.dirname(probe);
      }
    }
  }
  async list(input = ".", signal?: AbortSignal) {
    const base = await this.resolve(input);
    const paths: string[] = [];
    let bytes = 0;
    let visited = 0;
    const walk = async (dir: string, depth: number) => {
      signal?.throwIfAborted();
      if (depth > 40 || bytes > MAX_BYTES || visited > 20000) return;
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        signal?.throwIfAborted();
        visited++;
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(target, depth + 1);
        else if (entry.isFile()) {
          const relative = path
            .relative(this.root, target)
            .split(path.sep)
            .join("/");
          paths.push(relative);
          bytes += Buffer.byteLength(relative) + 1;
        }
        if (bytes > MAX_BYTES || visited > 20000) break;
      }
    };
    await walk(base, 0);
    return {
      paths: paths.sort(),
      truncated: bytes > MAX_BYTES || visited > 20000,
    };
  }
  async read(input: string) {
    const target = await this.resolve(input);
    const stat = await fs.stat(target);
    if (!stat.isFile()) throw new Error("Not a regular file");
    const handle = await fs.open(target, "r");
    try {
      const buffer = Buffer.alloc(Math.min(stat.size, MAX_BYTES));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (buffer.subarray(0, bytesRead).includes(0))
        throw new Error("Binary file");
      return (
        buffer.subarray(0, bytesRead).toString("utf8") +
        (stat.size > MAX_BYTES ? truncated : "")
      );
    } finally {
      await handle.close();
    }
  }
  async write(input: string, content: string, signal: AbortSignal) {
    const target = await this.resolve(input, true);
    signal.throwIfAborted();
    if (Buffer.byteLength(content) > MAX_BYTES)
      throw new Error("File exceeds 1 MiB");
    await fs.mkdir(path.dirname(target), { recursive: true });
    await this.resolve(input, true);
    const previous = await fs.stat(target).catch(() => null);
    if (previous && !previous.isFile()) throw new Error("Not a regular file");
    const temp = path.join(
      path.dirname(target),
      `.computador-${randomUUID()}.tmp`,
    );
    try {
      await fs.writeFile(temp, content, {
        flag: "wx",
        mode: previous?.mode ?? 0o600,
      });
      signal.throwIfAborted();
      await fs.rename(temp, target);
    } finally {
      await fs.unlink(temp).catch(() => {});
    }
    return `Written: ${input}`;
  }
}
export class ToolService {
  constructor(
    readonly host: HostRuntime,
    readonly shellTimeout = 120000,
  ) {}
  async execute(
    name: string,
    args: Record<string, unknown>,
    signal: AbortSignal,
    onOutput?: (output: string) => void,
  ): Promise<string> {
    signal.throwIfAborted();
    const definition = toolDefinitions.find((t) => t.name === name);
    if (!definition) throw new Error(`Unknown tool: ${name}`);
    for (const [key, value] of Object.entries(args))
      if (
        !Object.hasOwn(definition.parameters.properties, key) ||
        typeof value !== "string"
      )
        throw new Error(`Invalid argument: ${key}`);
    for (const key of definition.parameters.required)
      if (typeof args[key] !== "string")
        throw new Error(`Missing argument: ${key}`);
    const a = args as Record<string, string>;
    switch (name) {
      case "list_files": {
        const result = await this.host.list(a.path, signal);
        return (
          clip(result.paths.join("\n")) + (result.truncated ? truncated : "")
        );
      }
      case "read_file":
        return this.host.read(a.path);
      case "write_file":
        return this.host.write(a.path, a.content, signal);
      case "edit_file": {
        if (!a.oldText) throw new Error("oldText must not be empty");
        const file = await this.host.resolve(a.path);
        if ((await fs.stat(file)).size > MAX_BYTES)
          throw new Error("File exceeds 1 MiB");
        const content = await this.host.read(a.path);
        const at = content.indexOf(a.oldText);
        if (at < 0 || content.indexOf(a.oldText, at + 1) >= 0)
          throw new Error("oldText must match exactly once");
        return this.host.write(
          a.path,
          content.slice(0, at) +
            a.newText +
            content.slice(at + a.oldText.length),
          signal,
        );
      }
      case "search_files": {
        if (!a.query) throw new Error("query must not be empty");
        const { paths } = await this.host.list(a.path, signal);
        let result = "";
        for (const file of paths) {
          signal.throwIfAborted();
          try {
            const text = await this.host.read(file);
            text.split("\n").forEach((line, i) => {
              if (
                line.includes(a.query) &&
                Buffer.byteLength(result) <= MAX_BYTES
              )
                result += `${file}:${i + 1}: ${line}\n`;
            });
          } catch {
            /* Skip binary/unreadable files. */
          }
          if (Buffer.byteLength(result) > MAX_BYTES) break;
        }
        return clip(result);
      }
      case "run_shell":
        return this.shell(a.command, signal, onOutput);
      default:
        throw new Error("Unknown tool");
    }
  }
  private shell(
    command: string,
    signal: AbortSignal,
    onOutput?: (output: string) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const windows = process.platform === "win32";
      const shell = windows
        ? process.env.ComSpec || "cmd.exe"
        : process.env.SHELL || "/bin/sh";
      const child = spawn(
        shell,
        windows ? ["/d", "/s", "/c", command] : ["-c", command],
        {
          cwd: this.host.root,
          detached: !windows,
          stdio: ["ignore", "pipe", "pipe"],
          env: process.env,
        },
      );
      let output = "";
      let size = 0;
      let timedOut = false;
      let overflow = false;
      let termination: Promise<void> | undefined;
      const kill = () => {
        if (!child.pid || termination) return;
        const pid = child.pid;
        termination = new Promise<void>((finished) => {
          if (windows) {
            const killer = spawn(
              "taskkill",
              ["/pid", String(pid), "/T", "/F"],
              { stdio: "ignore" },
            );
            killer.once("error", () => {
              child.kill();
              finished();
            });
            killer.once("close", () => finished());
          } else {
            try {
              process.kill(-pid, "SIGTERM");
            } catch {}
            setTimeout(() => {
              try {
                process.kill(-pid, "SIGKILL");
              } catch {}
              finished();
            }, 500);
          }
        });
      };
      const timer = setTimeout(() => {
        if (!signal.aborted) {
          timedOut = true;
          kill();
        }
      }, this.shellTimeout);
      const receive = (label: string) => (chunk: Buffer) => {
        const available = MAX_BYTES - size;
        if (available > 0) {
          const text = chunk.subarray(0, available).toString("utf8");
          output += `${label}${text}`;
          size += Buffer.byteLength(label) + Buffer.byteLength(text);
          onOutput?.(clip(output));
        }
        if (chunk.length > available) overflow = true;
      };
      child.stdout.on("data", receive(""));
      child.stderr.on("data", receive("[stderr] "));
      signal.addEventListener("abort", kill, { once: true });
      if (signal.aborted) kill();
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", kill);
      };
      child.once("error", (e) => {
        cleanup();
        reject(e);
      });
      child.once("close", async (code) => {
        cleanup();
        await termination;
        resolve(
          clip(output) +
            (overflow ? truncated : "") +
            `\n[exit ${code}${timedOut ? " · timeout" : ""}${signal.aborted ? " · cancelled" : ""}]`,
        );
      });
    });
  }
}
