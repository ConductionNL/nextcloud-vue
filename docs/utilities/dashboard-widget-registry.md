# dashboardWidgetRegistry

The shared, mutable single source of truth for the dashboard widget catalog (cn-widget-library). A plain object map keyed by widget `type` string — the value persisted in a dashboard placement.

This registry is intentionally **separate** from `BUILT_IN_WIDGETS` (the v2 manifest object-detail widget set). The two systems compose at the [`CnWidgetGrid`](../components/cn-widget-grid.md) resolution boundary but keep independent cores: `BUILT_IN_WIDGETS` keys are object-detail widgets that need a loaded OpenRegister object, whereas catalog widgets are content/config-driven.

## The registry shape

```js
import { dashboardWidgetRegistry } from '@conduction/nextcloud-vue'
```

`dashboardWidgetRegistry` is a `Record<string, DashboardWidgetEntry>`. Each `type` key maps to an entry descriptor:

| Field | Type | Description |
|-------|------|-------------|
| `renderer` | `object` | Vue component for the dashboard grid (may be a lazy/async component definition). |
| `form` | `object \| null` | Vue component for the [`CnAddWidgetModal`](../components/cn-add-widget-modal.md) sub-form, or `null`/`undefined` for a renderer-only type (excluded from the picker). |
| `defaultContent` | `object` | Initial `content` payload seeded into new placements. |
| `displayName` | `string` | Human-readable type name shown in the type picker. |
| `icon` | `string` | Material Design icon name used in the type picker. |
| `requires` | `{ graphql?: string[] }` | Optional. Soft runtime-source hint for cross-app widgets — names the sibling-app schemas the widget reads. NEVER a `manifest.dependencies` entry. |

## Public API

| Function | Purpose |
|----------|---------|
| [`registerDashboardWidget(type, entry)`](./register-dashboard-widget.md) | Register (or override) a widget type. |
| [`listWidgetTypes()`](./list-widget-types.md) | List the registered types that have a usable form. |
| [`getWidgetTypeEntry(type)`](./get-widget-type-entry.md) | Look up one entry (or `null`). |
| [`getDefaultContent(type)`](./get-default-content.md) | Get a fresh copy of a type's `defaultContent` (or `{}`). |
| [`registerBuiltinDashboardWidgets()`](./register-builtin-dashboard-widgets.md) | No-op that guarantees the built-in catalog's self-registration side effects run. |

## The self-registration pattern

The catalog widgets self-register into this registry **at import time**. Each widget capability owns its own registration — its `index.js` calls `registerDashboardWidget(type, entry)` as a side effect when imported:

```js
// src/components/CnTextWidget/index.js (illustrative)
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import CnTextWidget from './CnTextWidget.vue'
import CnTextWidgetForm from '../CnTextWidgetForm/CnTextWidgetForm.vue'

registerDashboardWidget('text', {
  renderer: CnTextWidget,
  form: CnTextWidgetForm,
  defaultContent: { text: '', /* … */ },
  displayName: 'Text',
  icon: 'FormatText',
})
```

`registerBuiltinDashboardWidgets.js` aggregates every built-in widget's `index.js` import, and the library barrel imports that aggregator — so the catalog is populated whenever a consuming app imports `@conduction/nextcloud-vue`. Call [`registerBuiltinDashboardWidgets()`](./register-builtin-dashboard-widgets.md) once at bootstrap if a bundler tree-shakes the bare side-effect imports.

The individual widget components are intentionally **not** public barrel exports — they are resolved by their registry `type` key (the whole point of the registry), so consumers reference them via the manifest `widgetKey`, not by import.

## Registration policy (last-registration-wins)

Registering an existing `type` overwrites the prior entry and emits a development `console.warn` naming the overwritten type, so accidental double-registration is visible. Consumer `cnRegistry` overrides still win over this registry at `CnWidgetGrid` resolution time, so an app never has to mutate this shared object to skin a single widget.

## How CnWidgetGrid resolves a widget by type key

When [`CnWidgetGrid`](../components/cn-widget-grid.md) renders a placement with `widgetKey === key`, it resolves the component in this order (later steps only run when the earlier ones miss):

1. **Consumer `cnRegistry` inject** — `effectiveRegistry[key]` (`entry.component ?? entry`). An app override wins first.
2. **`BUILT_IN_WIDGETS[key]`** — the manifest object-detail widget set.
3. **This registry** — `getWidgetTypeEntry(key)?.renderer`, the 18 self-registered catalog widgets.
4. **Miss** — logs a `console.warn` naming the unknown `widgetKey` and skips the placement.

So a consumer override beats a built-in, which beats a catalog widget — and an unregistered key fails loudly rather than rendering nothing silently.

## Related

- [`CnAddWidgetModal`](../components/cn-add-widget-modal.md) — Consults `listWidgetTypes()` / `getWidgetTypeEntry()` to render the picker and sub-form.
- [`useWidgetForm`](./composables/use-widget-form.md) — Uses `getDefaultContent()` to seed/merge form state.
