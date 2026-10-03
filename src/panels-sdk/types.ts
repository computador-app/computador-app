import type { ComponentType } from "react";
import type { Locale } from "../i18n";
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type PanelState = { [key: string]: JsonValue };
export type LocalizedText =
  string | ({ en: string } & Partial<Record<Locale, string>>);
export type PanelLocation = "left" | "right" | "above" | "below" | "within";
export interface PanelContext {
  readonly instanceId: string;
  readonly panelType: string;
  readonly locale: Locale;
  readonly theme: "dark" | "light";
  readonly state: PanelState;
  setState(state: PanelState): void;
  commands: { execute(id: string, payload?: JsonValue): boolean };
  events: {
    subscribe(event: string, handler: (payload: JsonValue) => void): () => void;
  };
  lifecycle: { onDispose(callback: () => void): () => void };
}
export interface PanelProps {
  context: PanelContext;
}
/** Components are trusted, bundled application code. External UI must use SandboxPanel. */
export interface PanelDefinition {
  id: string;
  title: LocalizedText;
  component: ComponentType<PanelProps>;
  location: PanelLocation;
  multiple?: boolean;
  owner?: string;
  stateVersion?: number;
  defaultState?: PanelState;
  migrateState?: (state: PanelState, fromVersion: number) => PanelState;
}
export interface PanelInstance {
  id: string;
  panelType: string;
  state: PanelState;
  stateVersion: number;
}
export function panelTitle(title: LocalizedText, locale: Locale) {
  return typeof title === "string" ? title : title[locale] || title.en;
}
