---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 10, 48"
---

# Decisões e roteamento

O Decision Engine é independente e entra na fase 7. A delegação real inicial pode ser solicitada pelo próprio modelo via tool interna. Limiares exemplificados são configuráveis e não representam uma política de produção já validada.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 10. Decision Engine

O Decision Engine deve ser uma abstração independente dos agentes.

Ele é usado para decisões classificatórias ou probabilísticas.

```ts
interface DecisionEngine {
  decide<TOption>(request: DecisionRequest<TOption>): Promise<DecisionResult<TOption>>;
}
```

Usos:

- Agent Router;
- Model Router;
- Tool Router;
- autonomia;
- gates de segurança;
- seleção de contexto;
- seleção de estratégia;
- triagem de tarefas.

---

### 10.1 Agent Router

Pergunta conceitual:

> Qual agente deve executar esta tarefa?

Entrada:

```ts
{
  task,
  candidateAgents: routingProfiles
}
```

Saída:

```ts
{
  selected: 'researcher',
  confidence: 0.88,
  alternatives: [
    { id: 'general', confidence: 0.09 },
    { id: 'programmer', confidence: 0.03 }
  ]
}
```

---

### 10.2 Model Router

Pergunta conceitual:

> Qual modelo deve executar esta tarefa dentro deste agente?

Pode considerar:

- complexidade;
- latência;
- custo;
- privacidade;
- disponibilidade local;
- tamanho do contexto;
- suporte a tool calling;
- suporte multimodal;
- nível de risco.

---

### 10.3 Tool Router

Pergunta conceitual:

> Quais tools são relevantes para esta execução?

Isso evita enviar dezenas de schemas de tools ao modelo sem necessidade.

---

### 10.4 Política de confiança

Exemplo:

```ts
if (decision.confidence >= 0.85) {
  autoExecute();
} else if (decision.confidence >= 0.60) {
  suggestToUser();
} else {
  fallbackToRootAgent();
}
```

Os limites devem ser configuráveis.

---

## 48. Modo de roteamento configurável

O usuário pode escolher:

```text
Manual
- nunca delega automaticamente

Suggest
- sugere agente especializado

Automatic
- delega automaticamente acima de um limiar
```

Configuração:

```ts
interface RoutingPolicy {
  mode: 'manual' | 'suggest' | 'automatic';
  autoThreshold: number;
  suggestThreshold: number;
}
```

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
