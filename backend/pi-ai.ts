import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import {
  cleanupSessionResources,
  getSupportedThinkingLevels,
  type Context,
  type Tool,
  type Message,
  type ModelsStoreEntry,
} from "@earendil-works/pi-ai";
import type { Credentials } from "./credentials.js";
import type {
  ImageAttachment,
  ModelRef,
  ProviderDescriptor,
  ThinkingLevel,
} from "../src/shared/protocol.js";
import type { LLMService, Interaction, ToolCall, Turn } from "./llm.js";
import { toolDefinitions } from "./tools.js";
import type { Store } from "./store.js";
export class PiAILLMService implements LLMService {
  private models;
  constructor(
    private credentials: Credentials,
    private store: Store,
  ) {
    this.models = builtinModels({
      credentials,
      modelsStore: {
        read: async (id, options) => {
          options?.signal?.throwIfAborted();
          return this.store.get<ModelsStoreEntry | undefined>(
            `catalog:${id}`,
            undefined,
          );
        },
        write: async (id, entry, options) => {
          options?.signal?.throwIfAborted();
          this.store.set(`catalog:${id}`, entry);
        },
        delete: async (id, options) => {
          options?.signal?.throwIfAborted();
          this.store.db
            .prepare("DELETE FROM settings WHERE key=?")
            .run(`catalog:${id}`);
        },
      },
    });
  }
  private enabled() {
    return new Set(
      this.store.db
        .prepare("SELECT id FROM providers WHERE enabled=1")
        .all()
        .map((r) => r.id as string),
    );
  }
  async catalog() {
    const enabled = this.enabled();
    await this.models.refresh({
      providers: [...enabled],
      allowNetwork: false,
      signal: AbortSignal.timeout(5000),
    });
    const providers: ProviderDescriptor[] = [];
    const models = [];
    for (const p of this.models.getProviders()) {
      // Classifier/image-only providers are outside this chat integration.
      if (!p.getModels().length && !p.refreshModels) continue;
      let status: ProviderDescriptor["status"] = "disconnected";
      let error: string | undefined;
      if (enabled.has(p.id)) {
        try {
          status = (await this.models.checkAuth(p.id, {
            signal: AbortSignal.timeout(10000),
          }))
            ? "configured"
            : "disconnected";
        } catch {
          status = "error";
          error = "Falha na autenticação / Authentication failed";
        }
      }
      providers.push({
        id: p.id,
        name: p.name,
        configured: enabled.has(p.id),
        status,
        error,
        methods: [
          ...(p.auth.apiKey
            ? [
                {
                  type: "api_key" as const,
                  name: p.auth.apiKey.name,
                  ambient: !p.auth.apiKey.login,
                },
              ]
            : []),
          ...(p.auth.oauth
            ? [
                {
                  type: "oauth" as const,
                  name: p.auth.oauth.loginLabel ?? p.auth.oauth.name,
                },
              ]
            : []),
        ],
      });
      if (enabled.has(p.id)) {
        let available = p.getModels();
        try {
          if (p.filterModels)
            available = p.filterModels(
              available,
              await this.credentials.read(p.id),
            );
        } catch {
          providers[providers.length - 1].status = "error";
          available = [];
        }
        for (const m of available)
          models.push({
            provider: p.id,
            modelId: m.id,
            name: m.name,
            contextWindow: m.contextWindow,
            input: [...m.input],
            thinkingLevels: getSupportedThinkingLevels(m),
          });
      }
    }
    return { providers, models };
  }
  async login(
    id: string,
    method: "api_key" | "oauth",
    interaction: Interaction,
  ) {
    const p = this.models.getProvider(id);
    if (!p) throw new Error("Unknown provider");
    if (method === "api_key" && p.auth.apiKey && !p.auth.apiKey.login) {
      if (!(await this.models.checkAuth(id, { signal: interaction.signal })))
        throw new Error(
          "Configure as credenciais do ambiente / Configure ambient credentials",
        );
    } else {
      await this.models.login(id, method, interaction, {
        getDeviceId: () => this.store.get("installationId", ""),
      });
    }
    this.store.db
      .prepare("INSERT OR REPLACE INTO providers VALUES(?,1)")
      .run(id);
    await this.models.refresh({ providers: [id], signal: interaction.signal });
  }
  async logout(id: string) {
    await this.models.logout(id);
    this.store.db.prepare("DELETE FROM providers WHERE id=?").run(id);
  }
  async refresh() {
    const result = await this.models.refresh({
      providers: [...this.enabled()],
      signal: AbortSignal.timeout(15000),
    });
    if (result.errors.size)
      throw new Error(
        "Falha ao atualizar alguns catálogos / Some catalogs could not be refreshed",
      );
  }
  recover(history: unknown[]) {
    const messages = history as Message[];
    const repaired: unknown[] = [];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      repaired.push(message);
      if (message.role !== "assistant") continue;
      const calls = message.content.filter((c) => c.type === "toolCall");
      const results = new Set<string>();
      let j = i + 1;
      while (j < messages.length && messages[j].role === "toolResult") {
        results.add((messages[j] as { toolCallId: string }).toolCallId);
        repaired.push(messages[j]);
        j++;
      }
      for (const call of calls)
        if (!results.has(call.id))
          repaired.push(
            this.tool(
              call,
              "Execution interrupted; completion is unknown. The tool may have changed files or external state. Inspect the current state before repeating it.",
              true,
            ),
          );
      i = j - 1;
    }
    return repaired;
  }
  user(text: string, images: ImageAttachment[] = []) {
    return {
      role: "user",
      content: images.length
        ? [
            ...(text ? [{ type: "text" as const, text }] : []),
            ...images.map(({ data, mimeType }) => ({
              type: "image" as const,
              data,
              mimeType,
            })),
          ]
        : text,
      timestamp: Date.now(),
    };
  }
  tool(call: ToolCall, text: string, isError: boolean) {
    return {
      role: "toolResult",
      toolCallId: call.id,
      toolName: call.name,
      content: [{ type: "text", text }],
      isError,
      timestamp: Date.now(),
    };
  }
  async stream(
    ref: ModelRef,
    systemPrompt: string,
    history: unknown[],
    signal: AbortSignal,
    sessionId: string,
    thinkingLevel: ThinkingLevel,
    onText: (text: string) => void,
  ): Promise<Turn> {
    if (!this.enabled().has(ref.provider))
      throw new Error("Provedor desconectado / Provider disconnected");
    const model = this.models.getModel(ref.provider, ref.modelId);
    if (!model) throw new Error("Modelo indisponível / Model unavailable");
    const context: Context = {
      systemPrompt,
      messages: history as Message[],
      tools: toolDefinitions as Tool[],
    };
    const stream = this.models.streamSimple(model, context, {
      signal,
      sessionId,
      maxRetries: 0,
      timeoutMs: 120000,
      ...(thinkingLevel === "off" ? {} : { reasoning: thinkingLevel }),
    });
    let text = "";
    for await (const event of stream) {
      if (event.type === "text_delta") {
        text += event.delta;
        onText(text);
      }
    }
    const result = await stream.result();
    if (result.stopReason === "error") {
      const detail = (result.errorMessage ?? "").toLowerCase();
      if (/context|token.*limit|too long/.test(detail))
        throw new Error(
          "Limite de contexto excedido. Crie uma nova sessão / Context limit exceeded. Start a new session",
        );
      throw new Error(
        "Falha do provedor. Verifique conexão, credenciais e limites / Provider request failed. Check connection, credentials and limits",
      );
    }
    if (result.stopReason === "aborted") throw new Error("Cancelled");
    if (result.stopReason === "length")
      throw new Error("Limite de resposta atingido / Output limit reached");
    if (result.stopReason === "deferred" || result.stopReason === "pending")
      throw new Error(
        "Resposta adiada não suportada / Deferred response unsupported",
      );
    return {
      text: result.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join(""),
      calls: result.content.filter((c) => c.type === "toolCall") as ToolCall[],
      transcript: result,
      usage: {
        input: result.usage.input,
        output: result.usage.output,
        totalTokens: result.usage.totalTokens,
        cost: result.usage.cost.total,
      },
    };
  }
  complete(
    ref: ModelRef,
    system: string,
    history: unknown[],
    signal: AbortSignal,
    id: string,
    thinkingLevel: ThinkingLevel,
  ) {
    return this.stream(
      ref,
      system,
      history,
      signal,
      id,
      thinkingLevel,
      () => {},
    );
  }
  cleanup(id: string) {
    cleanupSessionResources(id);
  }
}
