import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockApplicationService } from "./service";
describe("mock application service", () => {
  let service: MockApplicationService;
  beforeEach(() => {
    vi.useFakeTimers();
    service = new MockApplicationService();
  });
  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });
  it("streams into the originating session when selection changes", () => {
    const original = service.getSnapshot().activeSessionId;
    service.sendMessage(original, "Review validation", "success", "en");
    const next = service.createSession();
    vi.advanceTimersByTime(10000);
    expect(service.getSnapshot().activeSessionId).toBe(next);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === next)?.messages,
    ).toHaveLength(0);
    const completed = service
      .getSnapshot()
      .sessions.find((s) => s.id === original)!;
    expect(completed.status).toBe("completed");
    expect(completed.messages.at(-1)?.text).toContain("simulated response");
  });
  it("waits for explicit permission and cancels when denied", () => {
    const id = service.getSnapshot().activeSessionId;
    service.sendMessage(id, "Read files", "permission", "en");
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("waiting_permission");
    service.resolvePermission(id, false);
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("cancelled");
  });
  it("resumes an allowed run, and supports a failed run followed by retry", () => {
    const id = service.createSession();
    service.sendMessage(id, "Read", "permission", "pt-BR");
    service.resolvePermission(id, true);
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("completed");
    service.sendMessage(id, "Fail", "failure", "en");
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("failed");
    service.sendMessage(id, "Retry", "success", "en");
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("completed");
  });
  it("cancels streams before deleting a session and disposes subscriptions", () => {
    const callback = vi.fn();
    const unsubscribe = service.subscribe(callback);
    const id = service.createSession();
    service.sendMessage(id, "Read", "success", "en");
    service.deleteSession(id);
    const count = callback.mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(callback).toHaveBeenCalledTimes(count);
    expect(service.getSnapshot().sessions.some((s) => s.id === id)).toBe(false);
    unsubscribe();
    service.createSession();
    expect(callback).toHaveBeenCalledTimes(count);
  });
  it("switches mocked workspaces without losing their in-memory sessions", () => {
    const id = service.getSnapshot().activeSessionId;
    service.sendMessage(id, "Read", "success", "en");
    service.openWorkspace("research");
    expect(service.getSnapshot().workspace.name).toBe("research-lab");
    expect(
      service
        .getSnapshot()
        .files.some((f) => f.path === "notes/observations.md"),
    ).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("cancelled");
    service.openWorkspace("demo");
    expect(service.getSnapshot().activeSessionId).toBe(id);
  });
  it("keeps domain data ephemeral across service instances", () => {
    service.createSession();
    service.saveAgent({
      name: "Custom agent",
      description: "Test",
      scope: "user",
      model: "Mock · Fast",
      instructions: "Review",
      canDelegate: false,
    });
    const fresh = new MockApplicationService();
    expect(fresh.getSnapshot().sessions).toHaveLength(2);
    expect(fresh.getSnapshot().agents).toHaveLength(2);
    fresh.dispose();
  });
  it("ignores blank or duplicate submissions during an active run", () => {
    const id = service.createSession();
    service.sendMessage(id, "  ", "success", "en");
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.messages,
    ).toHaveLength(0);
    service.sendMessage(id, "First", "success", "en");
    service.sendMessage(id, "Second", "success", "en");
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.messages,
    ).toHaveLength(2);
  });
  it("stops future tokens after explicit cancellation or disposal", () => {
    const id = service.createSession();
    service.sendMessage(id, "First", "success", "en");
    vi.advanceTimersByTime(130);
    service.cancelRun(id);
    const cancelled = service.getSnapshot();
    vi.advanceTimersByTime(10000);
    expect(service.getSnapshot()).toBe(cancelled);
    service.sendMessage(id, "Again", "success", "en");
    service.dispose();
    const disposed = service.getSnapshot();
    vi.advanceTimersByTime(10000);
    expect(service.getSnapshot()).toBe(disposed);
  });
  it("drops pending permission callbacks on workspace changes", () => {
    const id = service.getSnapshot().activeSessionId;
    service.sendMessage(id, "Read", "permission", "en");
    service.openWorkspace("research");
    service.resolvePermission(id, true);
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().sessions.find((s) => s.id === id)?.status,
    ).toBe("cancelled");
  });
  it("respects the selected agent delegation policy", () => {
    const id = service.createSession();
    service.updateSession(id, { agentId: "reviewer" });
    service.sendMessage(id, "Review", "success", "en");
    vi.advanceTimersByTime(10000);
    expect(
      service.getSnapshot().events.some((e) => e.type === "delegation"),
    ).toBe(false);
    expect(
      service
        .getSnapshot()
        .sessions.find((s) => s.id === id)
        ?.messages.at(-1)?.text,
    ).not.toContain("delegated");
  });
  it("keeps the last Markdown preview when opening a source file", () => {
    service.openFile("app/Http/Controllers/PricingController.php");
    expect(service.getSnapshot().selectedFile).toContain(".php");
    expect(service.getSnapshot().selectedMarkdown).toBe("README.md");
    service.openFile("missing.file");
    expect(service.getSnapshot().selectedFile).toContain(".php");
  });
  it("identifies root and delegated agents in runtime activity", () => {
    const id = service.createSession();
    service.sendMessage(id, "Review", "success", "en");
    vi.advanceTimersByTime(10000);
    const tool = service.getSnapshot().events.find((e) => e.type === "tool");
    const delegation = service
      .getSnapshot()
      .events.find((e) => e.type === "delegation");
    expect(tool?.agentName).toBe("Architect");
    expect(delegation?.agentName).toBe("Architect");
    expect(delegation?.delegatedAgentName).toBe("Reviewer");
    expect(delegation?.delegatedAgentId).not.toBe(delegation?.agentId);
  });
});
