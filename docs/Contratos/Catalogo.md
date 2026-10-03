---
tipo: referencia
status: planejado
origem: "harness-architecture.md"
---

# Catálogo de contratos conceituais

Os blocos TypeScript são mantidos em uma única nota por assunto. Nenhum deles é uma API implementada. Tipos referenciados, mas não definidos, precisam ser fechados no incremento que os consumir.

| Contratos | Nota canônica |
|---|---|
| AgentDefinition, AgentRoutingProfile, Session, AgentRun, AgentTask, AgentResult | [Domínio](Dominio.md) |
| RuntimeEvent e nomes do Event Bus | [Eventos e streaming](Eventos-e-streaming.md) |
| Serviços de aplicação e grupos do preload | [Serviços e IPC](Servicos-e-IPC.md) |
| PanelDefinition, PanelRegistry, PanelInstance, LayoutPreset | [Painéis](../Frontend/Paineis-e-layouts.md) |
| AgentRuntime, RuntimeLimits, AgentScheduler | [Agentes e execução](../Backend/Agentes-e-execucao.md) |
| DecisionEngine, RoutingPolicy | [Decisões e roteamento](../Backend/Decisoes-e-roteamento.md) |
| LLMService, ModelRef, AgentModelConfig, ModelCapabilities | [LLMs](../Backend/LLMs-e-catalogo.md) |
| ToolDefinition e ExtensionContext | [Tools e extensões](../Backend/Tools-skills-e-extensoes.md) |
| HostRuntime, PlatformInfo, ShellProvider | [Host Runtime](../Backend/Host-runtime.md) |
| PermissionPolicy e níveis de risco | [Segurança](../Backend/Seguranca-e-permissoes.md) |
| ContextStrategy | [Contexto e memória](../Backend/Contexto-e-memoria.md) |
| ArtifactRef | [Persistência e artifacts](../Backend/Persistencia-e-observabilidade.md) |
| AgentRegistry, ToolRegistry, ExtensionRegistry | [Registries](../Backend/Registries.md) |
| ExecutionTarget, ExecutionRuntime, Task, RuntimeCapabilities | [Execução distribuída](../Architecture/Runtime-distribuido.md) |

Dependências incompletas incluem ModelPolicy, MessageRef, SessionBranch, PermissionRequirement, ToolContext, TaskDefinition, TaskHandle, TaskStatus, LLMRequest, LLMResponse, LLMEvent e descritores de catálogo. WorkspaceContext é requerido conceitualmente, mas não recebe uma interface completa. Resolver esses tipos progressivamente; não preencher com `any` como contrato definitivo.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md)
