import { PanelRegistry } from "../panels-sdk/registry";
import {
  panelTitle,
  type PanelDefinition,
  type PanelProps,
} from "../panels-sdk/types";
import { validateManifest, type ExtensionManifest } from "./manifest";
import { SandboxPanel } from "./SandboxPanel";
export interface ExtensionBundle {
  manifest: unknown;
  files: Record<string, string>;
}
export interface ExtensionRecord {
  manifest: ExtensionManifest;
  enabled: boolean;
}
/** Bundles are supplied by discovery, never fetched or executed in the host renderer. */
export class ExtensionManager {
  private records = new Map<
    string,
    {
      manifest: ExtensionManifest;
      files: Record<string, string>;
      dispose?: () => void;
    }
  >();
  private snapshot: readonly ExtensionRecord[] = [];
  private listeners = new Set<() => void>();
  constructor(private registry: PanelRegistry) {}
  list = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  install(bundle: ExtensionBundle) {
    const manifest = validateManifest(bundle.manifest);
    if (this.records.has(manifest.id))
      throw new Error(`Extension already installed: ${manifest.id}`);
    const files = Object.fromEntries(
      manifest.panels.map((panel) => {
        const html = bundle.files[panel.entry];
        if (typeof html !== "string" || !html.trim() || html.length > 262144)
          throw new Error(`Invalid panel entry: ${panel.entry}`);
        return [panel.entry, html];
      }),
    );
    this.records.set(manifest.id, { manifest, files });
    this.notify();
  }
  enable(id: string) {
    const record = this.records.get(id);
    if (!record) throw new Error("Extension not installed");
    if (record.dispose) return;
    const definitions: PanelDefinition[] = record.manifest.panels.map(
      (panel) => ({
        id: `${id}.${panel.id}`,
        owner: id,
        title: panel.title,
        location: panel.location || "right",
        multiple: panel.multiple || false,
        stateVersion: 1,
        component: ({ context }: PanelProps) => (
          <SandboxPanel
            context={context}
            title={panelTitle(panel.title, context.locale)}
            html={record.files[panel.entry]}
            permissions={record.manifest.permissions}
          />
        ),
      }),
    );
    record.dispose = this.registry.registerMany(definitions);
    this.notify();
  }
  disable(id: string) {
    const record = this.records.get(id);
    if (record?.dispose) {
      record.dispose();
      record.dispose = undefined;
      this.notify();
    }
  }
  uninstall(id: string) {
    this.disable(id);
    if (this.records.delete(id)) this.notify();
  }
  private notify() {
    this.snapshot = Object.freeze(
      [...this.records.values()].map((r) => ({
        manifest: r.manifest,
        enabled: !!r.dispose,
      })),
    );
    for (const listener of [...this.listeners]) listener();
  }
}
