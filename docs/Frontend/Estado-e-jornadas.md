---
tipo: guia
status: planejado
origem: "harness-architecture.md"
---

# Estado da UI e jornadas

## Estado e dependências

React e TypeScript são decisões aceitas. Vite faz parte da sequência prevista. Zustand para UI, TanStack Query para dados assíncronos, biblioteca headless e CSS utility-first/CSS Modules são recomendações ou alternativas; não existem dependências instaladas.

Separar estado visual (painéis, seleção e layout) do estado de domínio (agentes, sessões e runs). Consumir serviços de aplicação e assinaturas com descarte quando um painel é removido. Commands expressam intenções e eventos notificam mudanças; painéis não devem importar outros painéis.

## Jornada do primeiro milestone

Abrir workspace → organizar painéis → criar agente → selecionar provider/modelo mock → criar sessão com esse root agent → enviar mensagem → visualizar streaming, tool call e delegação simulados → reabrir preservando layout e estado esperado.

Painéis iniciais: Chat, Files, Sessions, Agents, Terminal placeholder e Settings. O terminal não precisa executar processos reais nesta etapa. Runs, Logs, Artifacts, Memory, Decision Trace e Extension Manager pertencem à expansão progressiva descrita na fonte.

## Estados observáveis

A fase mockada deverá demonstrar execução em andamento, espera, conclusão e falha, além de solicitações simuladas de permissão. A UI deve explicar operações determinísticas e mostrar atividade de agentes. O mapeamento de estados de Task/AgentRun para a apresentação ainda precisa ser definido.

Persistir layouts sem componentes React. Sessões e agentes criados devem alimentar os serviços mockados, não variáveis específicas de cada painel. O armazenamento inicial ainda precisa ser escolhido e não deve antecipar migrations de produção.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Paineis e layouts](Paineis-e-layouts.md) · [Editor de agentes](Editor-de-agentes.md) · [Primeiro milestone](../Roadmap/Primeiro-milestone.md) · [Servicos e IPC](../Contratos/Servicos-e-IPC.md)
