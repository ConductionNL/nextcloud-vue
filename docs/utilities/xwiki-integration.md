# xwikiIntegration

The descriptor for the XWiki ("Articles") integration — a ready-to-`register()` payload mirroring OpenRegister's PHP `XwikiProvider` (id `xwiki`, group `external`, storage `external`, OpenConnector source `xwiki`). It pairs `CnXwikiTab` (sidebar tab) with `CnXwikiCard` (surface-aware widget) and declares `referenceType: 'xwiki'` for the AD-18 crossover.

This is a **leaf**, not a built-in: it is not part of [`builtinIntegrations`](./builtin-integrations.md) and [`registerBuiltinIntegrations()`](./register-builtin-integrations.md) does not register it. OpenRegister's main bundle registers it explicitly via [`registerXwikiIntegration()`](./register-xwiki-integration.md) when the `openconnector` app is installed.

## Signature

```js
import { xwikiIntegration } from '@conduction/nextcloud-vue'

// { id: 'xwiki', label: 'Articles', icon: 'FileDocumentMultiple',
//   requiredApp: 'openconnector', order: 30, group: 'external',
//   referenceType: 'xwiki', tab: CnXwikiTab, widget: CnXwikiCard,
//   defaultSize: { w: 4, h: 4 } }
```

## See also

- [`registerXwikiIntegration`](./register-xwiki-integration.md) — register it onto a registry
- [`CnXwikiTab`](../components/cn-xwiki-tab.md) / [`CnXwikiCard`](../components/cn-xwiki-card.md)
- [Pluggable integration registry guide](../guides/integrations.md)
