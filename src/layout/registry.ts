import { PanelRegistry } from "../panels-sdk/registry";
import type { PanelDefinition } from "../panels-sdk/types";
import { messages } from "../i18n";
export { PanelRegistry } from "../panels-sdk/registry";
import type { MessageKey } from "../i18n";
import {
  ChatPanel,
  SessionsPanel,
  FilesPanel,
  ViewerPanel,
  MarkdownPanel,
  AgentsPanel,
  ActivityPanel,
  TerminalPanel,
} from "../panels";
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
  { id: "agents", title: "agents", component: AgentsPanel, location: "right" },
  {
    id: "activity",
    title: "activity",
    component: ActivityPanel,
    location: "below",
  },
  {
    id: "terminal",
    title: "terminal",
    component: TerminalPanel,
    location: "below",
  },
] satisfies (Omit<PanelDefinition, "title"> & { title: MessageKey })[])
  panels.register({
    ...definition,
    title: {
      en: messages.en[definition.title],
      "pt-BR": messages["pt-BR"][definition.title],
    },
  });
