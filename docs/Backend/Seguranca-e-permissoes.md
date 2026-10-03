---
tipo: guia
status: planejado
origem: "harness-architecture.md; seções 19, 20, 21, 38"
---

# Segurança, permissões e secrets

> **Atualização de 03/10/2026:** a [fase 2 implementada](Fase-2-implementada.md) entrega pi-ai real, SQLite, sessões por pasta e ferramentas locais sem pedidos de permissão. As seções abaixo preservam a arquitetura planejada; recursos além desse incremento continuam futuros.


Aplicar validação e políticas na camada privilegiada. O renderer pode solicitar consentimento, mas não concede privilégio por conta própria. A tipagem TypeScript não substitui a validação de mensagens IPC em tempo de execução.

> **Estado do projeto:** arquitetura planejada; não há implementação no repositório na criação deste cofre. Decisões aceitas não significam funcionalidades entregues.

## 19. Permissões

Modelo recomendado:

```ts
interface PermissionPolicy {
  filesystem?: FilesystemPermission;
  process?: ProcessPermission;
  network?: NetworkPermission;
  secrets?: SecretPermission;
  agents?: AgentPermission;
  tools?: ToolPermission;
}
```

Exemplo de política:

```yaml
filesystem:
  read:
    - workspace
  write:
    - workspace

process:
  execute:
    - git
    - node

network:
  mode: prompt
```

---

## 20. Consentimento e ações sensíveis

Tools devem declarar nível de risco.

```ts
risk: 'read' | 'write' | 'execute' | 'external_side_effect' | 'destructive'
```

A política do usuário pode ser:

```text
Read-only                 → automático
Write                     → automático ou confirmação
Execute external process  → confirmação opcional
External side effect      → confirmação obrigatória
Destructive               → confirmação obrigatória
```

---

## 21. Secrets

Nunca armazenar chaves em `.myharness/` do projeto.

Usar storage seguro da plataforma:

- Windows Credential Manager;
- macOS Keychain;
- Secret Service/libsecret em Linux;
- fallback criptografado apenas se necessário.

A configuração referencia apenas aliases:

```yaml
provider:
  api_key: secret://openai/main
```

---

## 38. Segurança do Electron

Configurações recomendadas:

```text
contextIsolation: true
nodeIntegration: false
sandbox: true quando compatível
webSecurity: true
allowRunningInsecureContent: false
```

Além disso:

- CSP estrita;
- validação de IPC;
- schemas de entrada;
- allowlist de canais;
- sanitização de conteúdo HTML;
- nunca executar código vindo do renderer diretamente.

---

---

[Início](../Inicio.md) · [Índice da área](Indice.md) · [Pendencias](../Roadmap/Pendencias.md) · [Indice](../Contratos/Indice.md)
