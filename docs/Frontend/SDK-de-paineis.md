---
tipo: incremento
status: implementado
data: 2026-10-03
---

# SDK de painéis

O frontend possui um registro dinâmico de tipos de painel, instâncias com estado visual próprio e um SDK para interfaces de extensão executadas em iframe. O harness controla abas, docking, dimensões, títulos, abertura e restauração. A extensão fornece o conteúdo do painel.

Esta entrega prepara a implementação de novos painéis sem alterar o shell. O backend de domínio continua mockado. Não implementa o processo Extension Host previsto na [ADR-009](../ADRs/ADR-009-Extension-Host-isolado.md).

## Experimentar

Execute `npm run dev:electron` ou `npm run dev`. Abra o painel **Contador / Counter** no menu **Exibir / View** ou na paleta de comandos. A ação de nova instância na moldura cria outro contador independente. Cada contador permite incrementar, zerar e criar uma sessão mock pelo SDK. Alterações de tema e idioma chegam ao conteúdo; a troca de workspace dispara o evento de demonstração.

O diálogo **Extensões / Extensions**, acessível pelo menu Exibir e pela paleta, permite inspecionar e ativar/desativar os pacotes incluídos. Desativar remove os tipos do registro e encerra o conteúdo em execução; abas existentes mostram um aviso de painel indisponível. Reativar recupera o conteúdo com seu estado visual. A ativação é temporária: os pacotes válidos do build voltam a ser habilitados no próximo carregamento.

## Adicionar uma extensão ao projeto

1. Crie `extensions/meus-paineis/manifest.json` e um HTML para cada entrada declarada.
2. Use identificadores estáveis e exclusivos; forneça título em inglês como fallback e traduções opcionais.
3. Use scripts clássicos inline no HTML. CSS também deve estar no HTML; não há carregador de dependências externas, módulos JavaScript, rede ou filesystem para a extensão.
4. Inicie novamente o desenvolvimento ou gere um novo build. `src/extensions/bundles.ts` descobre manifestos e HTMLs com `import.meta.glob`, inclui os arquivos no build e os entrega em memória ao gerenciador.
5. Abra o painel, crie duas instâncias se `multiple` estiver habilitado, altere idioma/tema, salve e restaure o layout e teste desativação/reativação.

Não existe instalação por ZIP, URL, marketplace ou diretório escolhido pelo usuário. `ExtensionManager.install()` recebe um bundle em memória; esse contrato é o ponto para integrar descoberta/instalação futura. `enable`, `disable` e `uninstall` gerenciam o registro em memória. A distribuição atual é feita junto com o aplicativo.

## Manifesto, versão 1

```json
{
  "id": "minha.organizacao",
  "version": "1.0.0",
  "apiVersion": 1,
  "name": { "en": "My panels", "pt-BR": "Meus painéis" },
  "permissions": ["commands.session.new", "events.workspace.changed"],
  "panels": [{
    "id": "contador",
    "title": { "en": "Counter", "pt-BR": "Contador" },
    "entry": "contador.html",
    "location": "right",
    "multiple": true
  }]
}
```

O tipo registrado será `minha.organizacao.contador`. `id` da extensão e `id` local do painel não devem mudar quando o layout existente precisa continuar reconhecendo o painel. `version` identifica a versão do pacote; `apiVersion` seleciona o protocolo suportado, atualmente apenas `1`.

`name` e `title` aceitam uma string ou objeto com `en` obrigatório. `location` aceita `left`, `right`, `above`, `below` e `within`; o padrão é `right`. `multiple` permite instâncias independentes e é falso por padrão.

A validação rejeita identificadores duplicados, permissões desconhecidas, versões de API não suportadas, estados com propriedades perigosas e entradas com caminho absoluto, URL, travessia `..` ou escapes. Entradas são caminhos relativos terminados em `.html`, compostos de letras, números, hífen, sublinhado e barras entre diretórios. O arquivo deve estar presente no bundle. Há limite de 20 painéis por manifesto, 64 tipos no registro, 32.768 caracteres de JSON no manifesto e 262.144 caracteres por HTML.

## API dentro do iframe

`window.harnessPanel` fica disponível antes dos scripts da extensão. Aguarde `ready` antes de ler o contexto inicial.

| API | Comportamento |
|---|---|
| `await harnessPanel.ready` | Resolve com o primeiro contexto enviado pelo harness |
| `harnessPanel.context` | Contexto atual; `null` antes do handshake |
| `await harnessPanel.setState(objeto)` | Substitui o estado visual inteiro desta instância; não faz merge |
| `await harnessPanel.execute('session.new')` | Solicita nova sessão mock; exige permissão; não aceita payload de domínio |
| `harnessPanel.on('context', callback)` | Recebe contexto atualizado, incluindo estado, idioma e tema |
| `harnessPanel.on('workspace.changed', callback)` | Recebe `{id, name}` quando muda o workspace, se autorizado; não reproduz eventos passados |
| `harnessPanel.on('dispose', callback)` | Oportunidade de limpeza antes do descarte; não substitui persistência antecipada |

Cada `on()` retorna uma função que cancela aquela assinatura. As chamadas assíncronas rejeitam em caso de comando desconhecido, permissão ausente, payload inválido, indisponibilidade ou timeout de 10 segundos.

O contexto contém `instanceId`, `panelType`, `locale`, `theme` e `state`. `theme` é `dark` ou `light`; os idiomas atuais são `en` e `pt-BR`. Os autores aplicam essas informações ao próprio HTML/CSS. O harness não injeta componentes React, CSS do aplicativo nem seu contexto de domínio no iframe.

```html
<button id="count">0</button>
<script>
(async () => {
  const sdk = window.harnessPanel;
  await sdk.ready;
  const button = document.getElementById('count');
  const render = context => {
    button.textContent = String(context.state.count || 0);
    document.documentElement.lang = context.locale;
    document.documentElement.dataset.theme = context.theme;
  };
  render(sdk.context);
  const unsubscribe = sdk.on('context', render);
  button.onclick = async () => {
    try {
      await sdk.setState({ count: (sdk.context.state.count || 0) + 1 });
    } catch (error) {
      button.textContent = error.message;
    }
  };
  sdk.on('dispose', unsubscribe);
})();
</script>
```

## Permissões

| Permissão | Capacidade efetiva |
|---|---|
| `commands.session.new` | Executar exclusivamente o comando `session.new` |
| `events.workspace.changed` | Receber identificador e nome do workspace mock após alterações |

Um array vazio oferece apenas contexto e estado visual. Não há permissão genérica para todos os comandos ou eventos. Declarar uma permissão não cria uma implementação de backend. As permissões dos pacotes incluídos no build são concedidas pelo gerenciador; ainda não existe fluxo de consentimento por instalação nem política persistente de permissões.

## Estado e ciclo de vida

O estado visual pertence à instância, não ao tipo. `setState` recebe um objeto JSON simples; rejeita funções, ciclos, números não finitos e propriedades como `__proto__`. Na bridge há limite de 32.768 caracteres de JSON; a validação central também impõe profundidade máxima de 12 e 5.000 nós. Guarde filtros, seleção visual, aba ativa e pequenos parâmetros de apresentação. Não guarde segredos, conversas, conteúdo de arquivos ou resultados de ferramentas: esse armazenamento faz parte do layout, não de um backend de domínio.

O estado acompanha `uiState` e `stateVersion` nos parâmetros serializados pelo Dockview, nas mesmas chaves de layout existentes em `localStorage`. As ações de salvar/restaurar layout incluem esse estado; a saída da página também salva o layout corrente. Instâncias distintas têm IDs e estados independentes. Excluir uma aba ou aplicar um preset remove as instâncias daquele layout. Um layout salvo separadamente pode restaurá-las.

Tipos temporariamente ausentes preservam a aba e o estado para permitir reativação. Estado incompatível mostra recuperação para o valor inicial. Definições internas suportam `stateVersion`, `defaultState` e `migrateState`; o manifesto externo v1 usa estado versão 1 e ainda não oferece migração declarativa. Alterações de esquema de extensões precisam manter compatibilidade ou tratar o formato antigo no próprio painel.

Assinaturas do host são vinculadas ao escopo da instância e liberadas no fechamento/desativação. O SDK cancela pedidos pendentes quando recebe descarte. Uma notificação final de iframe não deve ser usada como garantia de execução: publique o estado visual durante o uso.

## Painéis internos confiáveis

Código empacotado e mantido pelo aplicativo pode registrar um `PanelDefinition` React em `PanelRegistry`. O componente recebe `{context: PanelContext}`: estado, idioma, tema, comandos, eventos e `lifecycle.onDispose`. `registerMany` valida o lote antes de publicá-lo e devolve uma função de remoção. Atualizações do catálogo refletem no shell e nos menus.

Esse contrato interno é mais amplo e não é uma fronteira de segurança. Não registre componentes React fornecidos por terceiros no renderer principal. Para esses conteúdos, use o bundle HTML e `SandboxPanel`.

## Isolamento e limites

`public/panel-host.html` é carregado em iframe com apenas `sandbox="allow-scripts"`, sem `allow-same-origin`, popups ou navegação do topo. A origem opaca impede leitura do DOM do harness e acesso direto à bridge `desktop`. O bootstrap dedicado possui CSP própria: scripts autorizados por nonce, CSS inline e bloqueio de fetch/conexões, imagens, fontes, frames, objetos, formulários e base URL. A CSP do renderer principal continua sem scripts inline liberados.

A bridge verifica janela remetente, token do canal, versão de protocolo, estrutura/tamanho da mensagem e permissões antes de executar ações. Apenas HTML e scripts inline do pacote são entregues ao iframe; scripts externos e módulos não são executados pelo carregador atual.

Isso não constitui isolamento de processo de backend nem garantia contra extensão maliciosa. Não há limite de CPU/memória, watchdog ou encerramento de Extension Host. A navegação da própria subjanela não é completamente bloqueada pelo sandbox; a CSP não deve ser apresentada como garantia universal contra exfiltração. Não há acesso autorizado a rede, arquivos reais, shell, LLM, credenciais, ferramentas ou processos por meio deste SDK.

## Arquivos e verificação

- `src/panels-sdk/`: tipos, registro, validação e escopo de eventos.
- `src/layout/PanelFrame.tsx`: moldura, contexto por instância e recuperação.
- `src/extensions/`: manifesto, gerenciador, descoberta de bundles e bridge.
- `public/panel-host.*`: documento e bootstrap isolados.
- `extensions/example-panels/`: extensão funcional de referência.

Execute `npm run build`, `npm test` e `npm run test:e2e`. Para verificar o ambiente desktop e o carregamento por arquivo, execute também `npm run test:electron` em uma sessão gráfica.

[Índice de Frontend](Indice.md) · [Primeira versão](Primeira-versao.md) · [Exemplo de extensão](../../extensions/example-panels/README.md)
