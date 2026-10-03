import { panels } from "../layout/registry";
import { ExtensionManager } from "./manager";
export const extensions = new ExtensionManager(panels);
export const extensionLoadErrors: string[] = [];
// Adding a source package here requires no shell changes; Vite bundles assets offline.
const manifests = import.meta.glob("../../extensions/*/manifest.json", {
  eager: true,
  import: "default",
});
const assets = import.meta.glob("../../extensions/**/*.html", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
for (const [path, manifest] of Object.entries(manifests)) {
  const directory = path.slice(0, path.lastIndexOf("/") + 1);
  const files = Object.fromEntries(
    Object.entries(assets)
      .filter(([key]) => key.startsWith(directory))
      .map(([key, html]) => [key.slice(directory.length), html]),
  );
  try {
    extensions.install({ manifest, files });
    const id = (manifest as { id: string }).id;
    extensions.enable(id);
  } catch (error) {
    extensionLoadErrors.push(
      `${path}: ${error instanceof Error ? error.message : "Invalid bundle"}`,
    );
  }
}
