---
tipo: incremento
status: implementado
data: 2026-10-02
---

# Primeira versão do frontend

O incremento entrega um aplicativo Electron executável com React, TypeScript e Vite. Segue a referência `computador-app-layout.html`: trilho lateral, arquivos e sessões à esquerda, chat central, prévia à direita e acentos roxos. Dockview 8 fornece docking, grupos, abas, divisão, redimensionamento e maximização.

## Decisão de escopo confirmada

Persistir **apenas layout, aparência e idioma**. Esta decisão para o incremento substitui o requisito de persistir sessões presente no planejamento original do primeiro milestone. Domínio permanece inteiramente em memória: reiniciar descarta conversas, agentes criados, seleção de workspace, estados de execução e alterações mockadas. Nenhum processo em execução é retomado.

O frontend persiste no localStorage do renderer: `computador.visual.v1` (tema, fonte e idioma), `computador.layout.v1` (último docking) e `computador.layout.saved.v1` (layout salvo manualmente). Layout contém IDs, tipos de painel e geometria, nunca mensagens ou conteúdo de arquivos. Existe um layout visual global; não há perfis por workspace nesta versão. JSON inválido recupera o padrão.

## Entrega

- Menu nativo exclusivo no Electron, integrado à barra global no macOS e à janela em Windows/Linux. A barra web é somente um fallback na prévia do navegador. Menus PT-BR/EN: Arquivo, Editar, Exibir, Janela, Ajuda e menu de aplicativo no macOS. Editar usa operações reais do Electron, incluindo clipboard.
- Abrir pasta e recentes escolhem entre dois workspaces simulados. Não existe diálogo que acesse o filesystem real.
- Sessões: criar, pesquisar, selecionar e excluir; trocar agente/modelo e conversar com streaming determinístico.
- Cenários explícitos no compositor: sucesso, falha recuperável e permissão (permitir/negar); interromper cancela a simulação.
- Atividade por sessão: ferramentas e delegação mock com agente de origem identificável.
- Arquivos: árvore expansível, leitura com numeração de linhas e cópia; sem edição de arquivos reais.
- Markdown: renderização independente do último arquivo de código, HTML inerte, imagens remotas omitidas e links de arquivos mock internos navegáveis.
- Agentes: formulário de identidade, descrição, instruções, escopo declarado, modelo e permissão de delegar. O catálogo é de demonstração; isolamento de agentes por projeto e políticas de execução pertencem ao backend futuro.
- Terminal: placeholder explícito, não aceita nem executa shell.
- Configurações: Geral, Aparência, Modelos, Agentes e Atalhos. Tema, fonte e idioma funcionam; preferências de provedores/políticas são ilustrativas e sem efeito no runtime.
- Layout: arrastar abas, redimensionar divisões, mover pelo seletor de cada painel, agrupar, maximizar, fechar/reabrir, presets Padrão/Foco/Revisão, salvar/restaurar.
- Paleta de comandos por `Ctrl/Cmd+Shift+P`; pasta `Ctrl/Cmd+O`, sessão `Ctrl/Cmd+N`, preferências `Ctrl/Cmd+,`.

## Organização e contratos

| Módulo | Responsabilidade |
|---|---|
| `electron/main.cjs` | Janela isolada, menus, validação de origem de IPC e ações de edição |
| `electron/preload.cjs` | API restrita `desktop.onCommand`, `setLocale` e `edit` |
| `src/domain/service.ts` | DTOs e contrato `ApplicationService`, implementação mock determinística e assinaturas |
| `src/domain/context.tsx` | Injeção do serviço e adaptação de snapshot para React; aceita implementação alternativa do contrato |
| `src/layout/registry.ts` | Definições de painel, separadas das instâncias e resolvidas por ID |
| `src/layout/Workspace.tsx` | Instâncias, presets, docking e persistência visual |
| `src/layout/commands.ts` | Intenções desacopladas, usadas pelo menu e entre painéis |
| `src/panels/` | Um módulo por painel, catálogo de traduções e Markdown seguro |
| `src/ui/` | Preferências em abas e diálogos acessíveis |

`ApplicationService` expõe snapshots imutavelmente substituídos e assinaturas descartáveis. Mensagens e eventos pertencem à sessão; trocar de sessão não redireciona um stream. Excluir a sessão, trocar de workspace ou desmontar o serviço limpa os timers correspondentes. `sendMessage` recebe ID de sessão, texto, cenário e idioma; erros mock aparecem em estado `failed`, permissão em `waiting_permission`, cancelamento em `cancelled`. Estes DTOs são para demonstração da UI e não fixam o futuro protocolo de runtime distribuído.

Adicionar painéis requer uma definição no registry. IDs de tipo e de instância são distintos; o shell não importa componentes individuais. O padrão abre uma instância de cada tipo. Não existem extensões de terceiros, popouts ou SDK de plugins.

Para um novo idioma, estenda o tipo `Locale`, os catálogos do shell/painéis/configurações e o menu nativo. Nenhum texto de usuário ou arquivo precisa ser traduzido. Português e inglês são oferecidos sem download de recursos externos.

## Validação

`npm run check`: typecheck/build, testes de serviço (streams, permissões, falhas, cancelamento, exclusão, troca de sessão/workspace, agentes), segurança do Markdown, preferências e comandos, além de menus/preload e jornadas Playwright.

E2E verifica posições por geometria, arraste de divisores, grupos, restauração, JSON corrompido, fechamento de todos os painéis, idiomas, temas, arquivos e conversas temporárias. O smoke `npm run test:electron` abre o renderer compilado e valida menus, bridge isolada e copiar/colar reais. Temas claro e escuro e configurações foram inspecionados visualmente.

Validado neste ambiente Linux. Os menus possuem estrutura específica para macOS, testada unitariamente; execução nativa em macOS/Windows e instaladores/distribuição ainda não foram validados.

[Índice de Frontend](Indice.md) · [Primeiro milestone planejado](../Roadmap/Primeiro-milestone.md)


## Compatibilidade de menu no KDE

O KDE deste ambiente anuncia `com.canonical.AppMenu.Registrar`. O teste de regressão reproduziu `isMenuBarVisible() === false` mesmo com o menu registrado, após remover a barra web. No Linux o bootstrap agora define `ELECTRON_FORCE_WINDOW_MENU_BAR=1` antes da criação das janelas, associa o menu à janela e desativa auto-hide. Isso mantém a barra nativa local, sem depender de um widget de menu global. A integração global do macOS permanece intacta.

O smoke verifica visibilidade ao abrir e depois de trocar idioma. Referência: [variável documentada pelo Electron](https://www.electronjs.org/docs/latest/api/environment-variables#electron_force_window_menu_bar-linux).
