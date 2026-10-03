import type { ComponentType } from "react";
import type { MessageKey } from "../i18n";
import {
  ChatPanel,
  SessionsPanel,
  FilesPanel,
  ViewerPanel,
  MarkdownPanel,
  TerminalPanel,
} from "../panels";
export interface PanelDefinition {
  id: string;
  title: MessageKey;
  component: ComponentType;
  location: "left" | "right" | "below" | "within";
}
export class PanelRegistry {
  private definitions = new Map<string, PanelDefinition>();
  register(definition: PanelDefinition) {
    if (this.definitions.has(definition.id))
      throw new Error(`Duplicate panel: ${definition.id}`);
    this.definitions.set(definition.id, definition);
  }
  get(id: string) {
    return this.definitions.get(id);
  }
  list() {
    return [...this.definitions.values()];
  }
}
export const panels = new PanelRegistry();
for (const definition of [
  { id: "chat", title: "chat", component: ChatPanel, location: "within" },
  { id: "files", title: "files", component: FilesPanel, location: "left" },
  {
    id: "sessions",
    title: "sessions",
    component: SessionsPanel,
    location: "left",
  },
  { id: "viewer", title: "viewer", component: ViewerPanel, location: "right" },
  {
    id: "markdown",
    title: "markdown",
    component: MarkdownPanel,
    location: "right",
  },
  {
    id: "terminal",
    title: "terminal",
    component: TerminalPanel,
    location: "below",
  },
] satisfies PanelDefinition[])
  panels.register(definition);
