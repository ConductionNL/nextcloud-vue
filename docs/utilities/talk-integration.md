# talkIntegration

Built-in integration provider descriptor for **Nextcloud Talk**. One of the canonical `builtinIntegrations` registered onto the pluggable integration registry (`window.OCA.OpenRegister.integrations`) by OpenRegister's bootstrap.

It declares the standard provider shape (`id`, `label`, `icon`, `requiredApp`, `order`, `group`, `referenceType`, `tab`, `widget`) so a Talk tab/widget surfaces in `CnObjectSidebar`, [CnIntegrationWidget](../components/cn-integration-widget.md), and the dashboards. See the [Pluggable Integration Registry](../../CLAUDE.md) section for the provider contract and registration flow.

## Usage

```js
import { talkIntegration } from '@conduction/nextcloud-vue'

OCA.OpenRegister.integrations.register(talkIntegration)
```

Most apps don't register it directly — it ships in `builtinIntegrations` and is registered via `registerBuiltinIntegrations()`.
