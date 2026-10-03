---
tipo: guia
status: implementado
origem: "Fase 2 — 03/10/2026"
---

# Fase 2 — Chat e runtime local

O Electron agora usa um backend real. A prévia no navegador continua sendo uma demonstração em memória, sem acesso a provedores ou arquivos reais.

## Fronteiras e contratos

O bootstrap em `electron/main.cjs` carrega o backend TypeScript compilado. O preload expõe operações específicas em `window.desktop.backend`; cada requisição valida remetente e payload. Não há acesso genérico a Node ou IPC no renderer.

Os DTOs serializáveis ficam em `src/shared/protocol.ts`. `Application` coordena workspace, sessões e execuções; `LLMService` é a fronteira do runtime com LLMs. Somente `backend/pi-ai.ts` conhece `@earendil-works/pi-ai@1.0.1`. A nomenclatura atual do pacote substitui o pacote descontinuado `@mariozechner/pi-ai`.

O serviço de renderer mantém snapshots recebidos por IPC. Eventos têm sequência, sessão e execução; uma recarga obtém o snapshot atual e não inicia outro run. Fechar um painel ou trocar de pasta não cancela o trabalho.

## Provedores e modelos

A aba **Provedores** oferece uma conexão por provedor e os métodos de autenticação expostos pelo SDK. Os prompts são adaptados para campos, seleções, códigos e navegador externo. A renovação OAuth usa o `CredentialStore` serializado por provedor.

Chaves e tokens são armazenados como blobs criptografados com `safeStorage`, fora do projeto. Se a plataforma não tiver armazenamento seguro (inclusive `basic_text` no Linux), ficam apenas em memória. A interface informa a necessidade de reconectar após fechar. Credenciais armazenadas não retornam ao renderer. Status “Configurado” identifica configuração disponível, não garante acesso a todos os modelos ou saldo.

A aba **Modelo** mantém o padrão global e uma lista de exclusões por `{provider, modelId}`. Ocultar só altera seletores: padrão e sessões existentes conservam o modelo. Os seletores do chat e do padrão usam menu de provedores e submenu de modelos, respeitando o tema. A visibilidade é organizada em grupos recolhíveis por provedor, com busca por nome/ID e switches (ligado = visível). As ações Mostrar todos/Ocultar todos sempre se aplicam ao provedor inteiro, mesmo com busca ativa. Cada nova sessão copia o padrão vigente. Conexões removidas não apagam histórico nem provocam troca automática de modelo.

O catálogo vem do SDK, com cache persistido para provedores dinâmicos. Endpoints arbitrários e cadastro manual de modelos não fazem parte desta fase.

## Persistência e recuperação

`computador.sqlite` fica no diretório `userData` do Electron. SQLite nativo usa WAL e chaves estrangeiras. A migration inicial cria workspaces, sessões, mensagens, transcripts privados versionados, runs, tool runs, configurações, provedores e credenciais criptografadas.

Pastas são identificadas por caminho canônico. Sessões exigem pasta, têm título, modelo, mensagens, status e timestamps. O título inicial vem da primeira mensagem. Pastas recentes e a última sessão são restauradas; pastas ausentes não são abertas automaticamente.

O histórico visível é separado do transcript privado do adaptador. Este preserva assinaturas e informações de continuidade necessárias ao SDK. Checkpoints de streaming são salvos no máximo a cada 150 ms; a conclusão e cada resultado de ferramenta são persistidos antes da próxima etapa. Após interrupção do processo, chamadas sem resultado recebem um resultado de interrupção na recuperação do transcript, sem reexecução.

## Ferramentas e limites

- `list_files`, `read_file`, `search_files`: leitura no workspace; busca literal; listagem omite `.git`, `node_modules` e links simbólicos.
- `write_file`: criação ou substituição atômica de arquivos UTF-8.
- `edit_file`: substituição de uma única ocorrência inequívoca; não edita arquivo truncado.
- `run_shell`: shell do host, diretório inicial do workspace, stdout/stderr e exit code. O painel Terminal acompanha essas chamadas; não é um PTY interativo.

Os caminhos das ferramentas de arquivo validam a raiz e links simbólicos. O shell executa com os privilégios do usuário e pode acessar o host; não existe sandbox de SO nem motor de permissões nesta fase, por decisão explícita de produto. O despacho centralizado permitirá adicionar políticas posteriormente.

Limites: uma execução por sessão; quatro simultâneas; vinte chamadas LLM e cinquenta ferramentas por execução; dez minutos por execução; dois minutos por comando; 1 MiB por leitura/resultado, mais o marcador de truncamento. Listagens têm limites de profundidade e quantidade de entradas. Escritas acima de 1 MiB são rejeitadas. Argumentos inválidos e erros de ferramentas retornam ao modelo. Cancelamento aborta LLM e encerra a árvore do processo shell.

Sem repetição automática de ferramentas, compactação de contexto, agentes delegados, editor de agentes ou runtime remoto. Limites de contexto e de resposta são apresentados como erro, preservando saída parcial.

## Evidência e desenvolvimento

- `tests/backend/runtime.test.mjs`: persistência, limites, autenticação, credenciais e catálogo SDK.
- `tests/backend/tools.test.mjs`: arquivos, contenção de caminhos, edição, saída e processos.
- `tests/electron-phase2.mjs`: cadastro por chave/assinatura fake, filtros, ferramentas, streaming, cancelamento, recarga e reinício.
- `tests/electron-smoke.mjs`: preload isolado, menus nativos, clipboard e preferências.

Execute `npm run check` e `npm run test:electron`. A suíte não usa contas externas. Para teste manual real: abrir pasta, conectar conta em Provedores, selecionar padrão em Modelo, criar conversa e pedir uma leitura, edição e comando. Reabrir o app e verificar o histórico. Testes reais de assinatura dependem da conta e da disponibilidade do provedor.

---

[Início](../Inicio.md) · [Backend](Indice.md) · [Fases do MVP](../Roadmap/Fases-do-MVP.md)
