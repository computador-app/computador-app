---
tipo: guia
status: planejado
origem: "harness-architecture.md"
---

# Serviços de aplicação e IPC

Os nomes abaixo são contratos previstos pela fonte. Exceto LLMService, as assinaturas completas ainda não foram definidas. Esta nota delimita responsabilidades para orientar sua especificação antes de implementar os consumidores.

| Serviço | Responsabilidade prevista | Implementação inicial |
|---|---|---|
| WorkspaceService | Abrir workspace e fornecer contexto do projeto | MockWorkspaceService |
| AgentService | Listar, criar e editar definições por escopo | MockAgentService |
| SessionService | Gerenciar sessões, root agent e mensagens | MockSessionService |
| RuntimeService | Solicitar e acompanhar execução pela aplicação | MockRuntimeService |
| LLMService | Catálogo, completion e streaming | MockLLMService, depois PiAILLMService |
| ToolService | Expor tools e operações à aplicação | MockToolService |

`RuntimeService` é a fachada para a aplicação; `AgentRuntime` executa agentes; `ExecutionRuntime` representa o ambiente que executa tasks. A fonte não define a ligação completa entre os três. Antes de escrever assinaturas, consolidar responsabilidades e IDs.

## Ponte prevista

O preload expõe grupos `sessions`, `agents`, `workspace`, `layout` e `runtime` em `window.harness`. O exemplo é conceitual: faltam canais, payloads, resultados e envelopes de erro. Não expor IPC genérico, módulos Node ou acesso direto a filesystem.

O renderer depende dos contratos de aplicação. Uma implementação mock e uma implementação real devem poder atender esses contratos sem reescrever os painéis. Estado privilegiado e permissões permanecem fora do renderer.

## Fechamento de contratos por incremento

Antes de implementar uma operação, registrar entrada, saída, erros observáveis, identidade/escopo e eventos necessários. Para streaming, especificar assinatura, descarte, falha e conclusão. Validar entradas na camada privilegiada e transportar DTOs serializáveis.

Não fixar HTTP/WebSocket ou shapes do futuro protocolo remoto para implementar IPC local. Também não usar objetos React ou APIs do Electron como entidades do domínio.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [LLMs e catalogo](../Backend/LLMs-e-catalogo.md) · [Processos e packages](../Architecture/Processos-e-packages.md) · [Eventos e streaming](Eventos-e-streaming.md)
