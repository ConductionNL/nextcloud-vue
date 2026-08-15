# useWidgetForm

Small Vue 2 composable shared by the [`CnAddWidgetModal`](../../components/cn-add-widget-modal.md) host and the per-type sub-form components (cn-widget-library). It owns the four state-management helpers the modal needs while keeping the host template free of form bookkeeping noise.

The composable returns a `Vue.observable` state container (Vue 2.7 / Options API — `@vue/composition-api` is not in this codebase): any component that touches `state.content` / `state.type` re-renders on change, the same way a `data()` field would.

## Signature

```js
import { useWidgetForm } from '@conduction/nextcloud-vue'

const {
  state,            // { type, content, editingWidget }
  resetForm,        // (type) => void
  loadEditingWidget,// (widget) => void
  validate,         // (subFormRef) => string[]
  assembleContent,  // (subFormRef) => { type, content }
} = useWidgetForm()
```

`useWidgetForm()` takes no arguments.

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `state` | `{ type: string, content: object, editingWidget: object \| null }` | Reactive form state container (`Vue.observable`). |
| `resetForm` | `(type) => void` | Helper to reset the form to registry defaults. |
| `loadEditingWidget` | `(widget) => void` | Helper to pre-fill state from an existing placement. |
| `validate` | `(subFormRef) => string[]` | Helper to ask the active sub-form whether it is valid. |
| `assembleContent` | `(subFormRef) => { type, content }` | Helper to build the `submit` payload. |

## Helpers

### `resetForm(type)`

Drops the form back to a fresh copy of the registry's `defaultContent` for `type` (via [`getDefaultContent`](../get-default-content.md)). Called when the modal opens in create mode and on every type-switch, so there is no cross-type content leakage.

- `type` `{string}` — registry key for the widget type.

### `loadEditingWidget(widget)`

Pre-fills `state` from an existing placement so the modal opens in edit mode with all fields populated. Merges `widget.content` over the registry defaults so any field the registry adds in a future version still gets a sensible default when the persisted blob is missing it. A falsy `widget` is a no-op.

- `widget` `{object}` — the placement being edited; must expose `type` and `content`.

### `validate(subFormRef)`

Asks the currently-mounted sub-form whether its inputs are valid; returns an empty array when valid. When `subFormRef` is missing or doesn't expose a `validate()` method it returns the `['__no-active-form__']` sentinel so the modal stays in a safe disabled state during transient swaps (e.g. between a type-switch render and `nextTick`).

- `subFormRef` `{object | null}` — the active sub-form Vue instance.

### `assembleContent(subFormRef)`

Builds the `{ type, content }` payload the modal emits via `submit`. Sub-forms expose their content either imperatively via an `assembledContent` getter, or reactively via `@update:content` events into `state.content`. This helper prefers the getter when present and falls back to `state.content` otherwise.

- `subFormRef` `{object | null}` — the active sub-form Vue instance.

## Related

- [`CnAddWidgetModal`](../../components/cn-add-widget-modal.md) — The modal this composable backs.
- [`dashboardWidgetRegistry`](../dashboard-widget-registry.md) — Source of per-type defaults and sub-forms.
