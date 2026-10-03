---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 52, 64"
---

# Riscos e evolução

Usar os riscos para orientar os incrementos e seus testes. Possibilidades futuras são opções de evolução, não compromissos de entrega nem requisitos adicionais do MVP.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 52. Riscos principais

### Complexidade prematura

O projeto pode virar uma plataforma enorme antes de ter um core utilizável.

**Mitigação:** construir vertical slices.

---

### Segurança de extensões

Executar código arbitrário é o maior risco técnico.

**Mitigação:** Extension Host isolado + permissions desde cedo.

---

### Explosão de contexto

Multi-agent pode gerar contextos enormes.

**Mitigação:** delegation packages + context policies.

---

### Loops de delegação

Agentes podem delegar indefinidamente.

**Mitigação:** budgets, depth limit e run graph.

---

### Provider fragmentation

Cada provider possui peculiaridades.

**Mitigação:** capability-driven abstraction.

---

### Cross-platform shell behavior

Shells possuem diferenças importantes.

**Mitigação:** Host Runtime + spawn sem shell quando possível.

---

## 64. Evolução futura

Possibilidades futuras:

- marketplace de extensões;
- multiusuário;
- organizações;
- políticas corporativas;
- SSO;
- sync entre dispositivos;
- execução remota por runtime self-hosted;
- servidor headless da mesma família do Desktop;
- sandbox por container;
- worker nodes;
- agentes residentes;
- schedules;
- triggers;
- webhooks;
- workflows visuais;
- semantic memory;
- shared team agents;
- remote MCP servers;
- local MCP discovery.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](Pendencias.md)
