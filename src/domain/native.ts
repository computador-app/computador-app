import type {
  ApplicationService,
  DomainState,
  Locale,
  Scenario,
} from "./service";
import type { BackendAPI, AppSnapshot, ModelRef } from "../shared/protocol";
export class NativeApplicationService implements ApplicationService {
  private listeners = new Set<() => void>();
  private state: DomainState = {
    workspace: { id: "", name: "Computador", path: "" },
    sessions: [],
    activeSessionId: "",
    selectedFile: "",
    selectedMarkdown: "",
    files: [],
    agents: [
      {
        id: "general",
        name: "Computador",
        description: "",
        scope: "user",
        model: "",
        instructions: "",
        canDelegate: false,
      },
    ],
    events: [],
  };
  private unsubscribe: () => void = () => {};
  private revision = -1;
  private filesVersion = 0;
  private disposed = false;
  constructor(readonly backend: BackendAPI) {}
  start = () => {
    this.disposed = false;
    this.unsubscribe();
    this.unsubscribe = this.backend.onEvent((event) =>
      this.apply(event.snapshot),
    );
    void this.perform(() => this.backend.snapshot().then((s) => this.apply(s)));
  };
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit(patch: Partial<DomainState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private apply(live: AppSnapshot) {
    if (live.revision < this.revision) return;
    this.revision = live.revision;
    const changed = live.workspace?.id !== this.state.workspace.id;
    const finished = this.state.live?.sessions.some(
      (s) =>
        s.status === "running" &&
        live.sessions.find((n) => n.id === s.id)?.status !== "running",
    );
    this.emit({
      live,
      workspace: live.workspace ?? { id: "", name: "Computador", path: "" },
      activeSessionId: live.activeSessionId,
      sessions: live.sessions.map((s) => ({
        ...s,
        agentId: "general",
        model: s.model ? JSON.stringify(s.model) : "",
        messages: s.messages
          .filter((m) => m.role !== "tool")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            text: m.text,
          })),
        status: s.status === "interrupted" ? "failed" : s.status,
      })),
      ...(changed ? { files: [], selectedFile: "", selectedMarkdown: "" } : {}),
    });
    if (changed || finished) void this.refreshFiles();
  }
  async perform<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      this.emit({ error: (e as Error).message });
      return undefined;
    }
  }
  clearError = () => this.emit({ error: undefined });
  private async refreshFiles() {
    const version = ++this.filesVersion;
    await this.perform(async () => {
      const paths = await this.backend.listFiles();
      if (version !== this.filesVersion) return;
      this.emit({
        files: paths.map((path) => ({
          path,
          content: this.state.files.find((f) => f.path === path)?.content ?? "",
          language: path.endsWith(".md")
            ? "markdown"
            : (path.split(".").at(-1) ?? "text"),
        })),
      });
      if (this.state.selectedFile) this.openFile(this.state.selectedFile);
    });
  }
  openWorkspace = (id: string) => {
    void this.perform(() => this.backend.openWorkspace(id || undefined));
  };
  createSession = () => {
    void this.perform(() => this.backend.createSession());
    return "";
  };
  selectSession = (id: string) => {
    void this.perform(() => this.backend.selectSession(id));
  };
  deleteSession = (id: string) => {
    void this.perform(() => this.backend.deleteSession(id));
  };
  updateSession = (
    id: string,
    patch: { title?: string; model?: string; agentId?: string },
  ) => {
    void this.perform(() =>
      this.backend.updateSession(id, {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.model ? { model: JSON.parse(patch.model) as ModelRef } : {}),
      }),
    );
  };
  openFile = (path: string) => {
    const workspaceId = this.state.workspace.id;
    this.emit({
      selectedFile: path,
      ...(path.endsWith(".md") ? { selectedMarkdown: path } : {}),
    });
    void this.perform(async () => {
      const content = await this.backend.readFile(path);
      if (this.state.workspace.id !== workspaceId) return;
      this.emit({
        files: this.state.files.map((f) =>
          f.path === path ? { ...f, content } : f,
        ),
      });
    });
  };
  saveAgent = () => {};
  sendMessage = (
    id: string,
    text: string,
    _scenario: Scenario,
    locale: Locale,
  ) => {
    void this.perform(() => this.backend.sendMessage(id, text, locale));
  };
  cancelRun = (id: string) => {
    void this.perform(() => this.backend.cancelRun(id));
  };
  resolvePermission = () => {};
  dispose = () => {
    this.disposed = true;
    this.unsubscribe();
    this.listeners.clear();
  };
}
