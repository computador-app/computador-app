---
tipo: referencia
status: referencia
origem: "harness-architecture.md"
---

# Rastreabilidade da fonte

Todas as 67 seções da fonte têm um destino abaixo. As notas agrupam assuntos relacionados, preservando referências conceituais e exemplos. A fonte original permanece intacta na raiz do repositório; `docs/` é a referência para novas alterações.

A aprovação da base pelo usuário transforma decisões explícitas em direção aceita. Recomendações, exemplos e alternativas não recebem aprovação automática.

| Seção | Assunto original | Destino canônico |
|---|---|---|
| 1 | Visão do produto | [Visão do produto e modos de uso](../Produto/Visao-e-modos.md) |
| 2 | Princípios arquiteturais | [Princípios e camadas](Principios-e-camadas.md) |
| 3 | Arquitetura de alto nível | [Princípios e camadas](Principios-e-camadas.md) |
| 4 | Processos do Electron | [Processos e packages](Processos-e-packages.md) |
| 5 | Workspace e escopos de configuração | [Configuração e workspaces](../Backend/Configuracao-e-workspaces.md) |
| 6 | Modelo de domínio principal | [Modelo de domínio](../Contratos/Dominio.md) |
| 7 | Agent Runtime | [Agentes, loop e delegação](../Backend/Agentes-e-execucao.md) |
| 8 | Loop agêntico | [Agentes, loop e delegação](../Backend/Agentes-e-execucao.md) |
| 9 | Delegação entre agentes | [Agentes, loop e delegação](../Backend/Agentes-e-execucao.md) |
| 10 | Decision Engine | [Decisões e roteamento](../Backend/Decisoes-e-roteamento.md) |
| 11 | Integração com LLMs via pi-ai | [LLMs e catálogo](../Backend/LLMs-e-catalogo.md) |
| 12 | Catálogo de modelos | [LLMs e catálogo](../Backend/LLMs-e-catalogo.md) |
| 13 | Skills | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 14 | Extensions | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 15 | Runtime de extensões | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 16 | Extension SDK | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 17 | Tools | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 18 | Host Runtime | [Host Runtime multiplataforma](../Backend/Host-runtime.md) |
| 19 | Permissões | [Segurança, permissões e secrets](../Backend/Seguranca-e-permissoes.md) |
| 20 | Consentimento e ações sensíveis | [Segurança, permissões e secrets](../Backend/Seguranca-e-permissoes.md) |
| 21 | Secrets | [Segurança, permissões e secrets](../Backend/Seguranca-e-permissoes.md) |
| 22 | Context Builder | [Contexto, memória e branches](../Backend/Contexto-e-memoria.md) |
| 23 | Memory | [Contexto, memória e branches](../Backend/Contexto-e-memoria.md) |
| 24 | Conversas e branches | [Contexto, memória e branches](../Backend/Contexto-e-memoria.md) |
| 25 | UI extensível | [Painéis e layouts](../Frontend/Paineis-e-layouts.md) |
| 26 | UI de criação de agentes | [Editor de agentes](../Frontend/Editor-de-agentes.md) |
| 27 | Agent Registry | [Registries de domínio](../Backend/Registries.md) |
| 28 | Tool Registry | [Registries de domínio](../Backend/Registries.md) |
| 29 | Extension Registry | [Registries de domínio](../Backend/Registries.md) |
| 30 | Persistence | [Persistência, observabilidade e artifacts](../Backend/Persistencia-e-observabilidade.md) |
| 31 | Event Bus | [Eventos e streaming](../Contratos/Eventos-e-streaming.md) |
| 32 | Observabilidade | [Persistência, observabilidade e artifacts](../Backend/Persistencia-e-observabilidade.md) |
| 33 | Decision Trace | [Persistência, observabilidade e artifacts](../Backend/Persistencia-e-observabilidade.md) |
| 34 | Streaming | [Eventos e streaming](../Contratos/Eventos-e-streaming.md) |
| 35 | Concorrência | [Agentes, loop e delegação](../Backend/Agentes-e-execucao.md) |
| 36 | Background agents | [Agentes, loop e delegação](../Backend/Agentes-e-execucao.md) |
| 37 | Artifacts | [Persistência, observabilidade e artifacts](../Backend/Persistencia-e-observabilidade.md) |
| 38 | Segurança do Electron | [Segurança, permissões e secrets](../Backend/Seguranca-e-permissoes.md) |
| 39 | Segurança de extensões | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 40 | Atualização de extensões | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 41 | Versionamento de API | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 42 | Estrutura sugerida de monorepo | [Processos e packages](Processos-e-packages.md) |
| 43 | Responsabilidades por package | [Processos e packages](Processos-e-packages.md) |
| 44 | Fluxo de inicialização | [Fluxos de aplicação](Fluxos.md) |
| 45 | Fluxo ao abrir um projeto | [Fluxos de aplicação](Fluxos.md) |
| 46 | Fluxo de uma mensagem | [Fluxos de aplicação](Fluxos.md) |
| 47 | Fluxo de delegação automática | [Fluxos de aplicação](Fluxos.md) |
| 48 | Modo de roteamento configurável | [Decisões e roteamento](../Backend/Decisoes-e-roteamento.md) |
| 49 | Modo projeto vs modo pessoal | [Visão do produto e modos de uso](../Produto/Visao-e-modos.md) |
| 50 | Estratégia de MVP | [Fases do MVP](../Roadmap/Fases-do-MVP.md) |
| 51 | Decisões arquiteturais sugeridas | [Índice dos ADRs](../ADRs/Indice.md) |
| 52 | Riscos principais | [Riscos e evolução](../Roadmap/Riscos-e-evolucao.md) |
| 53 | Testes | [Testes, mocks e fakes](../Desenvolvimento/Testes-e-fakes.md) |
| 54 | Mock Provider | [Testes, mocks e fakes](../Desenvolvimento/Testes-e-fakes.md) |
| 55 | Fake Host Runtime | [Testes, mocks e fakes](../Desenvolvimento/Testes-e-fakes.md) |
| 56 | Esquema mínimo de diretórios do projeto | [Configuração e workspaces](../Backend/Configuracao-e-workspaces.md) |
| 57 | Exemplo de configuração global | [Configuração e workspaces](../Backend/Configuracao-e-workspaces.md) |
| 58 | Exemplo de agente global | [Configuração e workspaces](../Backend/Configuracao-e-workspaces.md) |
| 59 | Exemplo de agente de projeto | [Configuração e workspaces](../Backend/Configuracao-e-workspaces.md) |
| 60 | Exemplo de tool extension | [Tools, skills e extensões](../Backend/Tools-skills-e-extensoes.md) |
| 61 | UX para execução determinística | [Visão do produto e modos de uso](../Produto/Visao-e-modos.md) |
| 62 | Tipos de componentes do ecossistema | [Visão do produto e modos de uso](../Produto/Visao-e-modos.md) |
| 63 | Separação entre comando e inferência | [Visão do produto e modos de uso](../Produto/Visao-e-modos.md) |
| 64 | Evolução futura | [Riscos e evolução](../Roadmap/Riscos-e-evolucao.md) |
| 65 | Arquitetura futura de Runtime Distribuído | [Runtime distribuído futuro](Runtime-distribuido.md) |
| 66 | Resumo da arquitetura | [Princípios e camadas](Principios-e-camadas.md) |
| 67 | Próximo passo recomendado | [Fases do MVP](../Roadmap/Fases-do-MVP.md) |

---

[Início](../Inicio.md) · [Índice da área](Indice.md)
