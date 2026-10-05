import type {
  ModelRef,
  ModelDescriptor,
  ProviderDescriptor,
  Usage,
  ThinkingLevel,
  ImageAttachment,
} from "../src/shared/protocol.js";
export interface Interaction {
  signal: AbortSignal;
  prompt(prompt: {
    type: "text" | "secret" | "select" | "manual_code";
    message: string;
    placeholder?: string;
    options?: readonly { id: string; label: string; description?: string }[];
    signal?: AbortSignal;
  }): Promise<string>;
  notify(event: {
    type: string;
    message?: string;
    url?: string;
    userCode?: string;
    verificationUri?: string;
    instructions?: string;
    links?: readonly { url: string; label?: string }[];
  }): void;
}
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
export interface Turn {
  text: string;
  calls: ToolCall[];
  transcript: unknown;
  usage?: Usage;
}
export interface LLMService {
  catalog(): Promise<{
    providers: ProviderDescriptor[];
    models: ModelDescriptor[];
  }>;
  login(
    id: string,
    method: "api_key" | "oauth",
    interaction: Interaction,
  ): Promise<void>;
  logout(id: string): Promise<void>;
  refresh(): Promise<void>;
  recover(history: unknown[]): unknown[];
  user(text: string, images?: ImageAttachment[]): unknown;
  tool(call: ToolCall, text: string, isError: boolean): unknown;
  stream(
    model: ModelRef,
    system: string,
    history: unknown[],
    signal: AbortSignal,
    sessionId: string,
    thinkingLevel: ThinkingLevel,
    onText: (text: string) => void,
  ): Promise<Turn>;
  complete(
    model: ModelRef,
    system: string,
    history: unknown[],
    signal: AbortSignal,
    sessionId: string,
    thinkingLevel: ThinkingLevel,
  ): Promise<Turn>;
  cleanup(id: string): void;
}
