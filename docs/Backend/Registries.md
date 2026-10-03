---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 27, 28, 29"
---

# Registries de domínio

Resolver agentes por ID usando a precedência documentada. Filtrar tools por permissões e capacidades antes de enviá-las ao modelo. O PanelRegistry é documentado na área de frontend e usa o mesmo princípio de registro modular.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 27. Agent Registry

Todos os agentes devem ser resolvidos por ID.

```ts
interface AgentRegistry {
  register(agent: AgentDefinition): void;
  unregister(id: string): void;
  resolve(id: string, workspaceId?: string): AgentDefinition;
  list(filter?: AgentFilter): AgentDefinition[];
}
```

Ordem de resolução:

```text
Workspace
User
Extensions
Built-in
```

---

## 28. Tool Registry

```ts
interface ToolRegistry {
  register(tool: ToolDefinition<any, any>): void;
  resolve(id: string): ToolDefinition<any, any>;
  listAvailable(context: RuntimeContext): ToolDefinition<any, any>[];
}
```

Tools indisponíveis devido a permissões ou plataforma não devem ser expostas ao modelo.

---

## 29. Extension Registry

```ts
interface ExtensionRegistry {
  discover(): Promise<ExtensionManifest[]>;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  reload(id: string): Promise<void>;
}
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
