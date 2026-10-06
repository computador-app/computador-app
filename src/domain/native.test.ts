import { describe, expect, it, vi } from "vitest";
import { NativeApplicationService } from "./native";
import type { AppSnapshot, BackendAPI, RuntimeEvent } from "../shared/protocol";

const snapshot = (revision = 1): AppSnapshot => ({
  revision,
  workspace: { id: "workspace", name: "Project", path: "/project" },
  recent: [],
  sessions: [
    {
      id: "session",
      workspaceId: "workspace",
      title: "Chat",
      agentRef: "user:default",
      model: { provider: "test", modelId: "fast" },
      thinkingLevel: "off",
      messages: [
        { id: "u", role: "user", text: "hello", createdAt: 1 },
        {
          id: "t",
          role: "tool",
          text: "hidden",
          createdAt: 2,
          tool: {
            id: "tool",
            name: "read_file",
            arguments: {},
            status: "completed",
          },
        },
      ],
      status: "interrupted",
      updatedAt: 1,
    },
  ],
  activeSessionId: "session",
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
      description: "General agent",
      systemPrompt: "Help",
      version: 1,
      path: "/agent.yaml",
      revision: "rev",
      isDefault: true,
      modelAvailable: true,
    },
  ],
  agentProblems: [],
  defaultAgentRef: "user:default",
  subagentRuns: [],
});

function backend(initial = snapshot()) {
  let listener: ((event: RuntimeEvent) => void) | undefined;
  const api = {
    snapshot: vi.fn(async () => initial),
    openWorkspace: vi.fn(async () => {}),
    createSession: vi.fn(async () => "new"),
    selectSession: vi.fn(async () => {}),
    updateSession: vi.fn(async () => {}),
    deleteSession: vi.fn(async () => {}),
    sendMessage: vi.fn(async () => {}),
    cancelRun: vi.fn(async () => {}),
    login: vi.fn(async () => {}),
    answerAuth: vi.fn(async () => {}),
    cancelAuth: vi.fn(async () => {}),
    removeProvider: vi.fn(async () => {}),
    setDefault: vi.fn(async () => {}),
    setHidden: vi.fn(async () => {}),
    refreshModels: vi.fn(async () => {}),
    saveAgent: vi.fn(async () => {}),
    deleteAgent: vi.fn(async () => {}),
    setDefaultAgent: vi.fn(async () => {}),
    cancelSubagent: vi.fn(async () => {}),
    listFiles: vi.fn(async () => ["README.md", "src/index.ts"]),
    readFile: vi.fn(async () => "contents"),
    onEvent: vi.fn((callback: (event: RuntimeEvent) => void) => {
      listener = callback;
      return vi.fn();
    }),
  } satisfies BackendAPI;
  return { api, emit: (next: AppSnapshot) => listener?.({ sequence: 1, snapshot: next }) };
}

describe("NativeApplicationService", () => {
  it("maps snapshots, hides tool messages and refreshes workspace files", async () => {
    const { api } = backend();
    const service = new NativeApplicationService(api);
    const changed = vi.fn();
    service.subscribe(changed);
    service.start();
    await vi.waitFor(() => expect(service.getSnapshot().live?.revision).toBe(1));
    await vi.waitFor(() => expect(service.getSnapshot().files).toHaveLength(2));
    expect(service.getSnapshot().sessions[0]).toMatchObject({
      status: "failed",
      model: JSON.stringify({ provider: "test", modelId: "fast" }),
      messages: [{ id: "u", role: "user", text: "hello" }],
    });
    expect(service.getSnapshot().agents[0]).toMatchObject({
      id: "user:default",
      scope: "user",
    });
    expect(changed).toHaveBeenCalled();
    service.dispose();
  });

  it("ignores stale events and reports then clears backend errors", async () => {
    const { api, emit } = backend(snapshot(5));
    api.openWorkspace.mockRejectedValueOnce(new Error("cannot open"));
    const service = new NativeApplicationService(api);
    service.start();
    await vi.waitFor(() => expect(service.getSnapshot().live?.revision).toBe(5));
    emit({ ...snapshot(4), activeSessionId: "stale" });
    expect(service.getSnapshot().activeSessionId).toBe("session");
    service.openWorkspace("demo");
    await vi.waitFor(() => expect(service.getSnapshot().error).toBe("cannot open"));
    service.clearError();
    expect(service.getSnapshot().error).toBeUndefined();
  });

  it("forwards session mutations with parsed model and agent references", async () => {
    const { api } = backend();
    const service = new NativeApplicationService(api);
    service.updateSession("session", {
      title: "Renamed",
      model: JSON.stringify({ provider: "test", modelId: "reasoning" }),
      agentId: "user:reviewer",
    });
    service.sendMessage("session", "hello", "success", "en");
    service.cancelRun("session");
    await vi.waitFor(() => expect(api.updateSession).toHaveBeenCalled());
    expect(api.updateSession).toHaveBeenCalledWith("session", {
      title: "Renamed",
      model: { provider: "test", modelId: "reasoning" },
      agentRef: "user:reviewer",
    });
    expect(api.sendMessage).toHaveBeenCalledWith("session", "hello", "en");
    expect(api.cancelRun).toHaveBeenCalledWith("session");
  });

  it("loads selected files and preserves Markdown selection for source files", async () => {
    const { api } = backend();
    const service = new NativeApplicationService(api);
    service.start();
    await vi.waitFor(() => expect(service.getSnapshot().files).toHaveLength(2));
    service.openFile("README.md");
    await vi.waitFor(() =>
      expect(service.getSnapshot().files[0].content).toBe("contents"),
    );
    service.openFile("src/index.ts");
    expect(service.getSnapshot().selectedFile).toBe("src/index.ts");
    expect(service.getSnapshot().selectedMarkdown).toBe("README.md");
  });
});
