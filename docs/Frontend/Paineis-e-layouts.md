---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 25"
---

# Painéis e layouts

O shell deverá resolver tipos de painel pelo registry e manter IDs distintos para instâncias. Dados de layout devem ser serializáveis. Dockview é uma recomendação ainda sujeita a escolha; extensões de painel ficam para uma fase posterior.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 25. UI extensível

A interface deve nascer modular, baseada em **painéis registráveis**, mesmo enquanto todos os painéis ainda forem internos ao produto.

O objetivo é que novas releases consigam adicionar painéis sem alterar a estrutura central do workspace e que, futuramente, extensões de terceiros possam contribuir com novos painéis por meio de um SDK controlado.

Exemplos de painéis core:

- Chat;
- Files;
- Sessions;
- Agents;
- Agent Runs;
- Terminal;
- Logs;
- Artifacts;
- Memory;
- Decision Trace;
- Extension Manager.

### 25.1 Panel Registry

```ts
interface PanelDefinition {
  id: string;
  title: string;
  icon?: string;
  component: React.ComponentType<PanelProps>;
  defaultLocation?: 'left' | 'right' | 'bottom' | 'center';
  capabilities?: string[];
}

interface PanelRegistry {
  register(panel: PanelDefinition): void;
  unregister(id: string): void;
  get(id: string): PanelDefinition | undefined;
  list(): PanelDefinition[];
}
```

O workspace não importa diretamente cada painel. Ele renderiza instâncias resolvidas pelo registry.

### 25.2 Panel Definition vs Panel Instance

Separar o tipo de painel de suas instâncias. Isso permite, por exemplo, dois terminais independentes.

```ts
interface PanelInstance {
  id: string;
  panelType: string;
  state?: unknown;
}
```

Exemplo:

```json
{
  "id": "terminal-7f2",
  "panelType": "terminal",
  "state": {
    "cwd": "/workspace/api"
  }
}
```

### 25.3 Layout serializável

O layout deve ser dado persistível e não conter referências diretas a componentes React.

```ts
interface LayoutPreset {
  id: string;
  name: string;
  scope: 'user' | 'workspace';
  dockState: unknown;
}
```

Um layout referencia apenas `panelId`/`panelInstanceId`. Isso permite:

- persistência por usuário;
- persistência por projeto;
- presets;
- migrações entre versões;
- compartilhamento futuro.

Presets futuros possíveis:

- General;
- Coding;
- Research;
- Writing;
- Minimal.

### 25.4 Comunicação entre painéis

Painéis não devem importar outros painéis diretamente.

Usar `CommandRegistry` para intenções e `EventBus` para notificações:

```ts
commands.execute('session.open', { sessionId });
events.subscribe('session.changed', handler);
```

Isso também prepara uma futura Command Palette.

### 25.5 Painéis como contribuição de Extension

No futuro, uma `Extension` poderá contribuir com diferentes capacidades:

```text
Extension
 ├─ panels
 ├─ commands
 ├─ tools
 ├─ skills
 ├─ agents
 └─ settings
```

Manifesto conceitual:

```json
{
  "id": "com.example.my-extension",
  "version": "1.0.0",
  "engines": {
    "harness": "^1.0"
  },
  "contributes": {
    "panels": [
      {
        "id": "my-panel",
        "title": "My Panel",
        "entry": "./dist/panel.js"
      }
    ]
  }
}
```

Extensões de terceiros **não recebem acesso direto ao Electron, Node, `fs` ou `child_process`**. Elas acessam o sistema por APIs controladas do harness e pelo Host Runtime, sujeitas a permissões.

### 25.6 Estratégia de implementação

No MVP, todos os painéis podem ser built-in, mas devem ser implementados usando o mesmo contrato de registro previsto para extensões futuras.

Assim, abrir o ecossistema depois deixa de exigir uma reescrita da UI: muda-se a origem do registro, não o modelo conceitual.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Servicos e IPC](../Contratos/Servicos-e-IPC.md)
