---
tipo: guia
status: pendente
origem: "harness-architecture.md"
---

# Decisões e contratos pendentes

> **Atualização de 03/10/2026:** a [fase 2 implementada](../Backend/Fase-2-implementada.md) entrega pi-ai real, SQLite, sessões por pasta e ferramentas locais sem pedidos de permissão. As seções abaixo preservam a arquitetura planejada; recursos além desse incremento continuam futuros.


Esta lista contém lacunas da fonte e decisões necessárias aos próximos incrementos. Nenhuma alternativa abaixo está aprovada por esta nota.

| Momento | Pendência | Resultado necessário |
|---|---|---|
| Bootstrap | Gerenciador de pacotes, workspace/build, versões e empacotamento | Setup reproduzível para desktop |
| Shell visual | Dockview ou equivalente; headless UI; CSS | Decisão antes de construir layout e componentes |
| Estado da UI | Confirmar Zustand e TanStack Query recomendados | Regras de propriedade de estado |
| Serviços mockados | Assinaturas de serviços, validação e erros | Contratos consumíveis e substituíveis |
| Persistência mockada | Mecanismo e dados restaurados | Jornada de restart determinística |
| IPC | Canais permitidos, schemas, DTOs e ciclo de streaming | Ponte mínima validada no Main |
| Domínio de execução | Relação Task/Execution/AgentRun e IDs | Entidades e lifecycle consistentes |
| Serialização | Date em Session/AgentRun versus string em Task | DTOs sem dependência de objetos de processo |
| Configuração | JSON versus YAML; .myharness versus .harness | Formato e diretório canônicos |
| Configuração | model/modelPolicy; prompt/prompts; snake_case/camelCase | Mapeamento de arquivo para domínio |
| Configuração | extends, append, tools.add e permissões herdadas | Regras de merge e validação seguras |
| Catálogo | Descritores e eventos internos de LLMService | Fachada estável e adaptador pi-ai |
| Integração pi-ai | Identidade/versão da dependência e API efetiva | Verificação na fonte oficial no momento de integrar |
| Packages | Papel de model-provider-sdk após adoção de pi-ai | Evitar uma segunda abstração concorrente |
| Tools | delegate_task versus agent.delegate | IDs internos canônicos |
| Eventos | Event Bus, RuntimeEvent e protocolo remoto têm nomes diferentes | Separar ou mapear famílias de eventos |
| Runtime real | Cancelamento, retomada, retries, falhas e budgets | Transições e testes de execução |
| SQLite real | Driver, schema, tasks/executions e migrations | Persistência transacional evolutiva |
| Extensões | Worker/Child Process e fronteira de confiança | Modelo de isolamento e SDK versionado |
| Segurança | Storage por plataforma e fallback seguro | Integração de secrets sem arquivos versionáveis |
| Roteamento avançado | Jev é mencionado sem definição de integração | Especificação antes da fase 7 |

A precedência de configuração é defaults → user → project → session. A ordem do AgentRegistry é workspace → user → extensions → built-in. Não unificar essas duas regras sem uma decisão explícita.

Valores como thresholds 0.85/0.60 e limites 3/4/25 são exemplos, não defaults finais aprovados. A política de consentimento descrita na fonte é uma direção; fechamento de UX e persistência das concessões requer especificação.

Para resolver uma pendência, registrar decisão e consequências em ADR quando estrutural, atualizar a nota canônica e remover a ambiguidade dos contratos antes de implementar o consumidor.

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Entidades e lifecycle](../Architecture/Entidades-e-lifecycle.md) · [Catalogo](../Contratos/Catalogo.md)
