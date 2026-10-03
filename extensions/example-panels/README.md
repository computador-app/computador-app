# Exemplo de painel do harness

Este pacote demonstra uma extensão de interface sem alterar o shell do aplicativo. `manifest.json` declara o tipo `example.panels.counter`; `counter.html` implementa um contador em iframe usando `window.harnessPanel`.

Para experimentar, execute `npm run dev:electron` na raiz e abra **Exibir → Contador**. A moldura permite ancorar, maximizar e criar outra instância. Os contadores têm estado visual independente. O botão de nova sessão chama o serviço mock por um comando autorizado. Idioma, tema e eventos de troca de workspace chegam pelo SDK.

O pacote é descoberto por `src/extensions/bundles.ts` durante o build, com seus HTMLs incluídos como strings. Não é baixado nem instalado do filesystem em runtime. O diálogo **Extensões** permite habilitar/desabilitar o pacote durante a execução; no próximo carregamento os pacotes do build voltam a ser habilitados.

## Criar seu próprio painel

1. Copie esta pasta para outra pasta diretamente em `extensions/`.
2. Altere o `id` da extensão e os títulos do manifesto. Mantenha `apiVersion: 1`.
3. Edite o HTML, usando CSS e scripts clássicos inline. Não use imports, módulos, scripts remotos ou bibliotecas carregadas por URL.
4. Aguarde `await window.harnessPanel.ready`; leia `context` e assine `on('context', callback)` para atualizações.
5. Use `setState(objeto)` para substituir o pequeno estado visual da instância. Trate rejeições das promises.
6. Declare apenas as permissões necessárias e reinicie o desenvolvimento ou gere um novo build.

Permissões do exemplo:

- `commands.session.new`: permite `execute('session.new')`, sem payload, criando uma sessão mock.
- `events.workspace.changed`: permite `on('workspace.changed', callback)`, recebendo `{id, name}` em alterações futuras.

Sem essas permissões, contexto e estado visual continuam disponíveis. `on()` retorna uma função para cancelar a assinatura. Estado visual acompanha o layout salvo; dados de chat e domínio continuam apenas em memória.

Não use este estado para dados sensíveis, mensagens ou conteúdo de arquivos. Esta é uma extensão de UI isolada, sem API de filesystem, shell, rede, LLM ou processo de backend. Não há proteção contra loops de CPU, instalação de pacotes externos ou Extension Host de processos nesta versão.

O [guia completo do SDK](../../docs/Frontend/SDK-de-paineis.md) detalha manifesto, limites, ciclo de vida, persistência e a evolução prevista.
