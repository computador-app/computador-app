export interface ModelRef {
  provider: string;
  modelId: string;
}
export type AgentScope = "user" | "project";
export type AgentRef = `${AgentScope}:${string}`;
export interface AgentRuntimeConfig {
  maxDelegationDepth?: number;
  maxConcurrentSubagents?: number;
  maxTurns?: number;
  maxToolCalls?: number;
  timeoutSeconds?: number;
}
export interface AgentDefinition {
  version: 1;
  id: string;
  name: string;
  description: string;
  model?: ModelRef;
  thinkingLevel?: ThinkingLevel;
  systemPrompt: string;
  runtime?: AgentRuntimeConfig;
}
export interface AgentRecord extends AgentDefinition {
  ref: AgentRef;
  scope: AgentScope;
  path: string;
  revision: string;
  isDefault: boolean;
  modelAvailable: boolean;
}
export interface AgentProblem {
  scope: AgentScope;
  path: string;
  error: string;
}
export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
export const modelKey = (ref: ModelRef) =>
  JSON.stringify([ref.provider, ref.modelId]);
export interface ModelDescriptor extends ModelRef {
  name: string;
  contextWindow: number;
  input: ("text" | "image")[];
  thinkingLevels: ThinkingLevel[];
}
export interface ImageAttachment {
  name: string;
  data: string;
  mimeType: string;
}
export interface ProviderDescriptor {
  id: string;
  name: string;
  methods: { type: "api_key" | "oauth"; name: string; ambient?: boolean }[];
  configured: boolean;
  status: "disconnected" | "configured" | "pending" | "error";
  error?: string;
}
export interface AuthPrompt {
  id: string;
  type: "text" | "secret" | "select" | "manual_code";
  message: string;
  placeholder?: string;
  options?: readonly { id: string; label: string; description?: string }[];
}
export interface AuthState {
  provider: string;
  prompt?: AuthPrompt;
  message?: string;
  url?: string;
  userCode?: string;
}
export interface WorkspaceInfo {
  id: string;
  path: string;
  name: string;
}
export interface Usage {
  input: number;
  output: number;
  totalTokens: number;
  cost?: number;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  createdAt: number;
  incomplete?: boolean;
  model?: ModelRef;
  usage?: Usage;
  images?: ImageAttachment[];
  tool?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    status: "running" | "completed" | "failed";
    result?: string;
    subagentRunId?: string;
  };
}
export interface ChatSession {
  id: string;
  workspaceId: string;
  title: string;
  agentRef: AgentRef;
  agentSnapshot?: AgentDefinition;
  modelNotice?: string;
  modelOverridden?: boolean;
  model: ModelRef | null;
  thinkingLevel: ThinkingLevel;
  messages: ChatMessage[];
  status:
    "idle" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
  error?: string;
  updatedAt: number;
}
export interface SubagentRun {
  id: string;
  sessionId: string;
  parentRunId: string;
  parentSubagentRunId?: string;
  agentRef: AgentRef;
  agentName: string;
  depth: number;
  task: string;
  context?: string;
  model: ModelRef;
  thinkingLevel: ThinkingLevel;
  status: "running" | "completed" | "failed" | "cancelled" | "interrupted";
  error?: string;
  messages: ChatMessage[];
  startedAt: number;
  endedAt?: number;
}
export interface AppSnapshot {
  revision: number;
  workspace: WorkspaceInfo | null;
  recent: WorkspaceInfo[];
  sessions: ChatSession[];
  activeSessionId: string;
  providers: ProviderDescriptor[];
  models: ModelDescriptor[];
  defaultModel: ModelRef | null;
  defaultThinkingLevel: ThinkingLevel;
  hiddenModels: string[];
  auth: AuthState | null;
  secureStorage: boolean;
  agents: AgentRecord[];
  agentProblems: AgentProblem[];
  defaultAgentRef: AgentRef;
  subagentRuns: SubagentRun[];
}
export interface RuntimeEvent {
  sequence: number;
  sessionId?: string;
  runId?: string;
  snapshot: AppSnapshot;
}
export interface BackendAPI {
  snapshot(): Promise<AppSnapshot>;
  openWorkspace(id?: string): Promise<void>;
  createSession(): Promise<string>;
  selectSession(id: string): Promise<void>;
  updateSession(
    id: string,
    patch: {
      title?: string;
      model?: ModelRef;
      thinkingLevel?: ThinkingLevel;
      agentRef?: AgentRef;
    },
  ): Promise<void>;
  deleteSession(id: string): Promise<void>;
  sendMessage(
    id: string,
    text: string,
    locale: string,
    images?: ImageAttachment[],
  ): Promise<void>;
  cancelRun(id: string): Promise<void>;
  login(provider: string, method: "api_key" | "oauth"): Promise<void>;
  answerAuth(id: string, answer: string): Promise<void>;
  cancelAuth(): Promise<void>;
  removeProvider(id: string): Promise<void>;
  setDefault(model: ModelRef, thinkingLevel?: ThinkingLevel): Promise<void>;
  setHidden(keys: string[], hidden: boolean): Promise<void>;
  refreshModels(): Promise<void>;
  saveAgent(input: {
    scope: AgentScope;
    definition: AgentDefinition;
    expectedRevision?: string;
  }): Promise<void>;
  deleteAgent(ref: AgentRef): Promise<void>;
  setDefaultAgent(ref: AgentRef): Promise<void>;
  cancelSubagent(id: string): Promise<void>;
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string>;
  onEvent(callback: (event: RuntimeEvent) => void): () => void;
}
