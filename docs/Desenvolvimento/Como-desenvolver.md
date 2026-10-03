---
tipo: guia
status: planejado
origem: "harness-architecture.md"
---

# Como orientar o desenvolvimento

## Antes de implementar

1. Ler a visão do produto, os princípios e o milestone atual.
2. Identificar os contratos e decisões aceitas aplicáveis ao incremento.
3. Resolver apenas as pendências que bloqueiam esse incremento.
4. Definir comportamento observável e critérios de aceite usando o template de incremento.
5. Implementar uma fatia funcional, mantendo limites entre renderer, aplicação e runtime.

O bootstrap está implementado. Use Node.js 22.12+, `npm ci` e `npm run dev:electron`. `npm run check` executa typecheck/build, testes unitários e E2E (instale Chromium com `npx playwright install chromium`). `npm run test:electron` valida o desktop compilado em ambiente gráfico. Veja [Primeira versão](../Frontend/Primeira-versao.md) para o escopo efetivo.

## Ordem do primeiro incremento

Bootstrap Electron/React/TypeScript/Vite → preload e ponte mínima → PanelRegistry/PanelInstance/LayoutManager → docking e persistência de layout → CommandRegistry/EventBus → contratos de serviços → mocks → Agents/Sessions/Chat → editor de agentes → validação do milestone.

A integração com pi-ai e o AgentRuntime real começam depois da validação visual. Contratos necessários para execução independente da localidade devem ser considerados desde o início, sem construir infraestrutura remota.

## Próximas interações

Uma solicitação de desenvolvimento deve indicar milestone, comportamento desejado, nota canônica e critérios de aceite. Consulte as pendências antes de assumir nomes, tipos ou formatos de exemplos. Ao concluir um incremento, registre quais funcionalidades passaram de planejadas a implementadas e a evidência de validação.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Primeiro milestone](../Roadmap/Primeiro-milestone.md) · [Pendencias](../Roadmap/Pendencias.md) · [Incremento](../Templates/Incremento.md)
