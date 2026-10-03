import type { AppSnapshot, BackendAPI } from "../shared/protocol";
export type Locale = "pt-BR" | "en";
export type RunStatus =
  | "idle"
  | "running"
  | "waiting_permission"
  | "completed"
  | "failed"
  | "cancelled";
export type Scenario = "success" | "failure" | "permission";
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}
export interface Session {
  id: string;
  title: string;
  workspaceId: string;
  agentId: string;
  model: string;
  messages: Message[];
  status: RunStatus;
}
export interface Agent {
  id: string;
  name: string;
  description: string;
  scope: "user" | "workspace";
  model: string;
  instructions: string;
  canDelegate: boolean;
}
export interface MockFile {
  path: string;
  content: string;
  language: string;
}
export interface Activity {
  id: string;
  agentId: string;
  agentName: string;
  delegatedAgentId?: string;
  delegatedAgentName?: string;
  sessionId: string;
  type: "tool" | "delegation" | "run" | "permission";
  text: string;
  time: string;
}
export interface DomainState {
  live?: AppSnapshot;
  error?: string;
  workspace: { id: string; name: string; path: string };
  sessions: Session[];
  activeSessionId: string;
  selectedFile: string;
  selectedMarkdown: string;
  files: MockFile[];
  agents: Agent[];
  events: Activity[];
}
export interface ApplicationService {
  backend?: BackendAPI;
  start?: () => void;
  clearError?: () => void;
  getSnapshot: () => DomainState;
  subscribe: (callback: () => void) => () => void;
  openWorkspace: (id: "demo" | "research") => void;
  createSession: () => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSession: (
    id: string,
    patch: Partial<Pick<Session, "title" | "model" | "agentId">>,
  ) => void;
  openFile: (path: string) => void;
  saveAgent: (agent: Omit<Agent, "id"> & { id?: string }) => void;
  sendMessage: (
    id: string,
    text: string,
    scenario: Scenario,
    locale: Locale,
  ) => void;
  cancelRun: (id: string) => void;
  resolvePermission: (id: string, allowed: boolean) => void;
  dispose: () => void;
}
import { models } from "./models";
export { models } from "./models";
const demoFiles: MockFile[] = [
  {
    path: "README.md",
    language: "markdown",
    content:
      "# Core API\n\nA thoughtful foundation for the **Pricing Engine**.\n\n## Getting started\n\n```bash\ncomposer install\nphp artisan serve\n```\n\n## Architecture\n\n- `app/Http/Controllers` — HTTP endpoints\n- `app/Services` — pricing rules\n- `tests` — regression coverage\n\n> This workspace is a frontend demonstration. All files and executions are simulated.\n\n## Next steps\n\n1. Review discount boundaries.\n2. Add currency rounding coverage.\n3. Document the pricing response.\n",
  },
  {
    path: "app/Http/Controllers/PricingController.php",
    language: "php",
    content:
      "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Services\\PricingEngine;\nuse Illuminate\\Http\\Request;\n\nclass PricingController extends Controller\n{\n    public function __construct(\n        private readonly PricingEngine $pricing,\n    ) {}\n\n    public function calculate(Request $request)\n    {\n        $data = $request->validate([\n            'quantity' => ['required', 'integer', 'min:1'],\n            'unit_price' => ['required', 'numeric', 'min:0'],\n        ]);\n\n        return response()->json(\n            $this->pricing->calculate($data)\n        );\n    }\n}\n",
  },
  {
    path: "app/Services/PricingEngine.php",
    language: "php",
    content:
      "<?php\n\nnamespace App\\Services;\n\nfinal class PricingEngine\n{\n    public function calculate(array $input): array\n    {\n        $subtotal = $input['quantity'] * $input['unit_price'];\n        $discount = $input['quantity'] >= 10 ? 0.1 : 0;\n\n        return [\n            'subtotal' => $subtotal,\n            'discount' => $discount,\n            'total' => round($subtotal * (1 - $discount), 2),\n        ];\n    }\n}\n",
  },
  {
    path: "tests/PricingEngineTest.php",
    language: "php",
    content:
      "<?php\n\nit('applies volume discount', function () {\n    $engine = new App\\Services\\PricingEngine();\n    $result = $engine->calculate([\n        'quantity' => 10,\n        'unit_price' => 25,\n    ]);\n\n    expect($result['total'])->toBe(225.0);\n});\n",
  },
  {
    path: "composer.json",
    language: "json",
    content:
      '{\n  "name": "workspace/core-api",\n  "description": "Pricing Engine",\n  "require": { "php": "^8.3" }\n}\n',
  },
];
const researchFiles: MockFile[] = [
  {
    path: "README.md",
    language: "markdown",
    content:
      "# Research notebook\n\n## Interface study\n\nExplore flexible workspaces for focused work.\n\n- Compare panel arrangements\n- Record observations\n- Draft recommendations\n",
  },
  {
    path: "notes/observations.md",
    language: "markdown",
    content:
      "# Observations\n\nA persistent layout helps users return to a familiar workspace.\n\n## Open questions\n\n1. Which panels belong together?\n2. What should a focused workspace show?\n",
  },
];
let sequence = 0;
const uid = () => `mock-${++sequence}`;
export class MockApplicationService implements ApplicationService {
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private waiting = new Map<string, () => void>();
  private state: DomainState = {
    workspace: { id: "demo", name: "core-api", path: "/workspace/core-api" },
    activeSessionId: "session-pricing",
    selectedFile: "README.md",
    selectedMarkdown: "README.md",
    files: demoFiles,
    agents: [
      {
        id: "architect",
        name: "Architect",
        description: "Plan, build, and review your project.",
        scope: "workspace",
        model: models[0],
        instructions:
          "Review the project carefully and explain decisions clearly.",
        canDelegate: true,
      },
      {
        id: "reviewer",
        name: "Reviewer",
        description: "Focused code quality and regression review.",
        scope: "user",
        model: models[1],
        instructions: "Find actionable issues and propose focused changes.",
        canDelegate: false,
      },
    ],
    sessions: [
      {
        id: "session-pricing",
        workspaceId: "demo",
        title: "Pricing Engine",
        agentId: "architect",
        model: models[0],
        status: "completed",
        messages: [
          {
            id: "seed-user",
            role: "user",
            text: "Review the pricing engine and suggest a plan for improving its validation.",
          },
          {
            id: "seed-assistant",
            role: "assistant",
            text: "I reviewed the mock pricing flow. The controller already validates quantity and unit price, and delegates calculation to `PricingEngine`.\n\n### A focused plan\n\n1. **Cover boundaries** — test zero values and the volume discount threshold.\n2. **Keep money consistent** — make the rounding policy explicit.\n3. **Document the response** — describe subtotal, discount, and total.\n\nOpen the controller in the file tree to explore the implementation. Send a message below to try a simulated run.",
          },
        ],
      },
      {
        id: "session-review",
        workspaceId: "demo",
        title: "API review",
        agentId: "reviewer",
        model: models[1],
        messages: [],
        status: "idle",
      },
    ],
    events: [],
  };
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit = (patch: Partial<DomainState>) => {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  };
  private session = (id: string) =>
    this.state.sessions.find((s) => s.id === id);
  private patchSession = (id: string, patch: Partial<Session>) =>
    this.emit({
      sessions: this.state.sessions.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  private event = (sessionId: string, type: Activity["type"], text: string) => {
    const agent = this.state.agents.find(
      (a) => a.id === this.session(sessionId)?.agentId,
    );
    const child =
      type === "delegation"
        ? this.state.agents.find((a) => a.id !== agent?.id)
        : undefined;
    this.emit({
      events: [
        ...this.state.events,
        {
          id: uid(),
          sessionId,
          type,
          text,
          time: new Date().toISOString(),
          agentId: agent?.id || "unknown",
          agentName: agent?.name || "Mock agent",
          ...(child
            ? { delegatedAgentId: child.id, delegatedAgentName: child.name }
            : {}),
        },
      ].slice(-100),
    });
  };
  openWorkspace = (id: "demo" | "research") => {
    this.disposeTimers();
    this.emit({
      workspace: {
        id,
        name: id === "demo" ? "core-api" : "research-lab",
        path: `/workspace/${id === "demo" ? "core-api" : "research-lab"}`,
      },
      files: id === "demo" ? demoFiles : researchFiles,
      selectedFile: "README.md",
      selectedMarkdown: "README.md",
      sessions: this.state.sessions.map((s) =>
        s.status === "running" || s.status === "waiting_permission"
          ? { ...s, status: "cancelled" }
          : s,
      ),
    });
    const previous = this.state.sessions.find((s) => s.workspaceId === id);
    if (previous) this.selectSession(previous.id);
    else this.createSession();
  };
  createSession = () => {
    const id = uid();
    this.emit({
      sessions: [
        {
          id,
          workspaceId: this.state.workspace.id,
          title: "",
          agentId: this.state.agents[0].id,
          model: models[0],
          messages: [],
          status: "idle",
        },
        ...this.state.sessions,
      ],
      activeSessionId: id,
    });
    return id;
  };
  selectSession = (id: string) => {
    if (this.session(id)?.workspaceId === this.state.workspace.id)
      this.emit({ activeSessionId: id });
  };
  deleteSession = (id: string) => {
    this.clear(id);
    this.emit({ sessions: this.state.sessions.filter((s) => s.id !== id) });
    if (this.state.activeSessionId === id) {
      const next = this.state.sessions.find(
        (s) => s.workspaceId === this.state.workspace.id,
      );
      if (next) this.selectSession(next.id);
      else this.createSession();
    }
  };
  updateSession = (
    id: string,
    patch: Partial<Pick<Session, "title" | "model" | "agentId">>,
  ) => this.patchSession(id, patch);
  openFile = (path: string) => {
    if (this.state.files.some((f) => f.path === path))
      this.emit({
        selectedFile: path,
        ...(this.state.files.find((f) => f.path === path)?.language ===
        "markdown"
          ? { selectedMarkdown: path }
          : {}),
      });
  };
  saveAgent = (agent: Omit<Agent, "id"> & { id?: string }) => {
    if (!agent.name.trim()) return;
    const saved = { ...agent, name: agent.name.trim(), id: agent.id || uid() };
    this.emit({
      agents: agent.id
        ? this.state.agents.map((a) => (a.id === agent.id ? saved : a))
        : [...this.state.agents, saved],
    });
  };
  private clear = (id: string) => {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id);
    this.waiting.delete(id);
  };
  cancelRun = (id: string) => {
    const s = this.session(id);
    if (!s || !["running", "waiting_permission"].includes(s.status)) return;
    this.clear(id);
    this.patchSession(id, { status: "cancelled" });
    this.event(id, "run", "run.cancelled");
  };
  resolvePermission = (id: string, allowed: boolean) => {
    const resume = this.waiting.get(id);
    if (!resume) return;
    this.waiting.delete(id);
    if (allowed) {
      this.event(id, "permission", "permission.allowed");
      resume();
    } else this.cancelRun(id);
  };
  sendMessage = (
    id: string,
    text: string,
    scenario: Scenario,
    locale: Locale,
  ) => {
    const s = this.session(id);
    if (
      !s ||
      !text.trim() ||
      ["running", "waiting_permission"].includes(s.status)
    )
      return;
    const canDelegate =
      this.state.agents.find((a) => a.id === s.agentId)?.canDelegate ?? false;
    const responseId = uid();
    this.patchSession(id, {
      title: s.title || text.trim().slice(0, 42),
      messages: [
        ...s.messages,
        { id: uid(), role: "user", text: text.trim() },
        { id: responseId, role: "assistant", text: "" },
      ],
      status: "running",
    });
    this.event(id, "run", "run.started");
    const start = () => {
      this.patchSession(id, { status: "running" });
      this.event(id, "tool", "tool.read");
      let cursor = 0;
      const words = (
        locale === "en"
          ? "This is a simulated response using only the mock workspace.\n\nI inspected the available files and delegated a review to the selected mock agent.\n\n**Suggested next step:** add boundary tests for the pricing calculation, then review the validation rules. No files were changed and no external model was called."
          : "Esta é uma resposta simulada usando apenas o workspace de demonstração.\n\nAnalisei os arquivos disponíveis e deleguei uma revisão ao agente mock selecionado.\n\n**Próximo passo sugerido:** adicionar testes de limites para o cálculo de preços e revisar as regras de validação. Nenhum arquivo foi alterado e nenhum modelo externo foi chamado."
      )
        .replace(
          "and delegated a review to the selected mock agent",
          canDelegate
            ? "and delegated a review to the selected mock agent"
            : "with the selected mock agent",
        )
        .replace(
          "e deleguei uma revisão ao agente mock selecionado",
          canDelegate
            ? "e deleguei uma revisão ao agente mock selecionado"
            : "com o agente mock selecionado",
        )
        .split(/(?<=\s)/);
      const timer = setInterval(() => {
        const current = this.session(id);
        if (!current) {
          this.clear(id);
          return;
        }
        cursor += 2;
        if (cursor === 10 && canDelegate)
          this.event(id, "delegation", "delegation.started");
        if (scenario === "failure" && cursor >= 14) {
          this.clear(id);
          this.patchSession(id, { status: "failed" });
          this.event(id, "run", "run.failed");
          return;
        }
        this.patchSession(id, {
          messages: current.messages.map((m) =>
            m.id === responseId
              ? { ...m, text: words.slice(0, cursor).join("") }
              : m,
          ),
        });
        if (cursor >= words.length) {
          this.clear(id);
          this.patchSession(id, { status: "completed" });
          if (canDelegate) this.event(id, "delegation", "delegation.completed");
          this.event(id, "run", "run.completed");
        }
      }, 65);
      this.timers.set(id, timer);
    };
    if (scenario === "permission") {
      this.patchSession(id, { status: "waiting_permission" });
      this.waiting.set(id, start);
      this.event(id, "permission", "permission.requested");
    } else start();
  };
  private disposeTimers = () => {
    this.timers.forEach(clearInterval);
    this.timers.clear();
    this.waiting.clear();
  };
  dispose = () => {
    this.disposeTimers();
    this.listeners.clear();
  };
}
