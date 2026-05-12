# VALID_SURFACES

Frozen list of the surface names a JS integration may register a widget against.
Used by the integration registry to reject unknown surfaces in development.

## Values

```js
['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity']
```

| Surface | Where it renders |
| --- | --- |
| `user-dashboard` | The per-user dashboard (`CnDashboardPage` in user-scope mode). |
| `app-dashboard` | The app-level dashboard. |
| `detail-page` | An object detail page (`CnDetailPage`). |
| `single-entity` | A single-entity reference widget (e.g. inside `CnFormDialog` / `CnDetailGrid`). |

## Usage

```js
import { VALID_SURFACES, createIntegrationRegistry } from '@conduction/nextcloud-vue'

const registry = createIntegrationRegistry()
// registry.registerWidget(...) throws in dev when the surface is not in VALID_SURFACES
```

## Reference

- Implementation: [src/integrations/registry.js](../../src/integrations/registry.js)
- See also: [createIntegrationRegistry](./create-integration-registry.md), [builtinIntegrations](./builtin-integrations.md)
