// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DomainProvider } from "../domain/context";
import { MockApplicationService, type ApplicationService, type DomainState } from "../domain/service";
import type { AppSnapshot, BackendAPI } from "../shared/protocol";
import { AgentSettings } from "./AgentSettings";

afterEach(cleanup);

const live: AppSnapshot = {
  revision: 1,
  workspace: { id: "project", name: "Project", path: "/project" },
  recent: [],
  sessions: [],
  activeSessionId: "",
  providers: [],
  models: [],
  defaultModel: null,
  defaultThinkingLevel: "off",
  hiddenModels: [],
  auth: null,
  secureStorage: false,
  agents: [
    {
      ref: "user:default",
      scope: "user",
      id: "default",
      name: "Default",
      description: "Default agent",
      systemPrompt: "Help",
      version: 1,
      path: "/default.yaml",
      revision: "rev",
      isDefault: true,
      modelAvailable: true,
    },
  ],
  agentProblems: [],
  defaultAgentRef: "user:default",
  subagentRuns: [],
};

function realService() {
  const backend = {
    saveAgent: vi.fn(async () => {}),
  } as unknown as BackendAPI;
  const state: DomainState = {
    live,
    workspace: { id: "project", name: "Project", path: "/project" },
    sessions: [],
    activeSessionId: "",
    selectedFile: "",
    selectedMarkdown: "",
    files: [],
    agents: [],
    events: [],
  };
  const noop = () => {};
  const service: ApplicationService = {
    backend,
    getSnapshot: () => state,
    subscribe: () => noop,
    openWorkspace: noop,
    createSession: () => "",
    selectSession: noop,
    deleteSession: noop,
    updateSession: noop,
    openFile: noop,
    saveAgent: noop,
    sendMessage: noop,
    cancelRun: noop,
    resolvePermission: noop,
    dispose: noop,
  };
  return { service, backend };
}

describe("AgentSettings", () => {
  it("keeps browser-preview edits temporary and protects the last user agent", () => {
    const service = new MockApplicationService();
    render(
      <DomainProvider service={service} locale="pt-BR" onCommand={vi.fn()}>
        <AgentSettings />
      </DomainProvider>,
    );
    expect(screen.getByText("Alterações são temporárias e não gravam YAML.")).toBeTruthy();
    const deleteButtons = screen.getAllByRole("button", { name: "Excluir" });
    expect(deleteButtons).toHaveLength(2);
    expect(deleteButtons[1]).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Novo agente temporário · Usuário" }));
    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(3);
  });

  it("builds a normalized id and submits a complete new agent", async () => {
    const { service, backend } = realService();
    render(
      <DomainProvider service={service} locale="en" onCommand={vi.fn()}>
        <AgentSettings />
      </DomainProvider>,
    );
    await vi.waitFor(() => expect(screen.getAllByText("Default agent")).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "New agent" })[0]);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ágent Reviewer" } });
    expect(screen.getByLabelText("ID")).toHaveValue("agent-reviewer");
    fireEvent.change(screen.getByLabelText("Short description"), { target: { value: "Reviews changes" } });
    fireEvent.change(screen.getByLabelText("System prompt"), { target: { value: "Review carefully" } });
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));
    await vi.waitFor(() => expect(backend.saveAgent).toHaveBeenCalled());
    expect(backend.saveAgent).toHaveBeenCalledWith({
      scope: "user",
      definition: {
        version: 1,
        id: "agent-reviewer",
        name: "Ágent Reviewer",
        description: "Reviews changes",
        systemPrompt: "Review carefully",
      },
    });
  });
});
