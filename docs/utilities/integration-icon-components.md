# INTEGRATION_ICON_COMPONENTS

Map of every MDI icon referenced by a built-in or leaf integration descriptor, keyed by the PascalCase name the descriptor declares in its `icon:` field. Consumed by [`registerIntegrationIcons`](./register-integration-icons.md) to populate `CnIcon`'s registry.

Kept in lockstep with the `icon:` fields in `src/integrations/builtin/*.js` and `leaves.js`; the `scripts/check-integration-build.js` gate flags any descriptor whose icon is not registered here.

## Type

```ts
Record<string, import('vue').Component>
```

## Usage

```js
import { INTEGRATION_ICON_COMPONENTS, registerIntegrationIcons } from '@conduction/nextcloud-vue'

// Normally you just call the registrar, which registers this map:
registerIntegrationIcons()

// The raw map is exported for advanced cases (e.g. merging with app icons):
registerIcons({ ...INTEGRATION_ICON_COMPONENTS, ...myAppIcons })
```
