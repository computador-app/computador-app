import type { LLMService, Interaction, ToolCall, Turn } from "./llm.js";
import type {
  ImageAttachment,
  ModelRef,
  ThinkingLevel,
} from "../src/shared/protocol.js";
import type { Store } from "./store.js";
/** Deterministic Electron integration-test adapter. Never selected in production. */
export class FakeLLMService implements LLMService {
  constructor(private store: Store) {}
  async catalog() {
    const configured = this.store.get("fake-connected", false);
    return {
      providers: [
        {
          id: "test",
          name: "Test provider",
          methods: [
            { type: "api_key" as const, name: "API key" },
            { type: "oauth" as const, name: "Subscription" },
          ],
          configured,
          status: configured
            ? ("configured" as const)
            : ("disconnected" as const),
        },
      ],
      models: configured
        ? [
            {
              provider: "test",
              modelId: "fast",
              name: "Fast",
              contextWindow: 32000,
              input: ["text", "image"] as ("text" | "image")[],
              thinkingLevels: ["off"] as ThinkingLevel[],
            },
            {
              provider: "test",
              modelId: "reasoning",
              name: "Reasoning",
              contextWindow: 32000,
              input: ["text"] as ("text" | "image")[],
              thinkingLevels: [
                "off",
                "minimal",
                "low",
                "medium",
                "high",
              ] as ThinkingLevel[],
            },
          ]
        : [],
    };
  }
  async login(
    _id: string,
    method: "api_key" | "oauth",
    interaction: Interaction,
  ) {
    if (method === "oauth")
      interaction.notify({
        type: "device_code",
        userCode: "TEST-CODE",
        verificationUri: "https://example.com",
      });
    await interaction.prompt({
      type: method === "api_key" ? "secret" : "manual_code",
      message: "Test credential",
    });
    this.store.set("fake-connected", true);
  }
  async logout() {
    this.store.set("fake-connected", false);
  }
  async refresh() {}
  recover(history: unknown[]) {
    return history;
  }
  user(text: string, images: ImageAttachment[] = []) {
    return { role: "user", text, images };
  }
  tool(call: ToolCall, text: string, isError: boolean) {
    return { role: "tool", call, text, isError };
  }
  async stream(
    _model: ModelRef,
    _system: string,
    history: unknown[],
    signal: AbortSignal,
    _id: string,
    _thinkingLevel: ThinkingLevel,
    onText: (text: string) => void,
  ): Promise<Turn> {
    const last = history.at(-1) as { role?: string; text?: string } | undefined;
    let text = "Resposta de teste / Test response";
    let calls: ToolCall[] = [];
    if (last?.role === "user" && last.text === "tools")
      calls = [
        {
          id: "write",
          name: "write_file",
          arguments: { path: "agent-test.txt", content: "hello" },
        },
        {
          id: "read",
          name: "read_file",
          arguments: { path: "agent-test.txt" },
        },
        {
          id: "shell",
          name: "run_shell",
          arguments: { command: "echo shell-ok" },
        },
      ];
    const delay = last?.text === "slow" ? 200 : 2;
    for (let i = 1; i <= text.length; i++) {
      signal.throwIfAborted();
      await new Promise((r) => setTimeout(r, delay));
      onText(text.slice(0, i));
    }
    return {
      text,
      calls,
      transcript: { role: "assistant", text, calls },
      usage: { input: 5, output: 5, totalTokens: 10, cost: 0 },
    };
  }
  complete(
    model: ModelRef,
    system: string,
    history: unknown[],
    signal: AbortSignal,
    id: string,
    thinkingLevel: ThinkingLevel,
  ) {
    return this.stream(
      model,
      system,
      history,
      signal,
      id,
      thinkingLevel,
      () => {},
    );
  }
  cleanup() {}
}
