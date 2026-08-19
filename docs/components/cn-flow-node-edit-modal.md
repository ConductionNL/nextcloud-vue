---
sidebar_position: 48
---

# CnFlowNodeEditModal

Edit one flow step through a **real form**, not a JSON textarea.

The dialog renders one field per option the ENGINE declares for the step —
the catalogue's `configKeys` — plus any key already present on the node. Each
field's widget follows its value: switches for booleans, a number field for
numbers, a JSON area for structured values, and a method picker for `method`.
The step's catalogue description opens the dialog, so the author reads what
the step *does* right above the options it takes.

```vue
<!-- Hosted by CnFlowDetail; open it by naming the node: -->
useFlowStore().editingNodeId = node.id
```

## Opening it

- Double-click a node on the [`CnFlowDetail`](./cn-flow-detail.md) canvas.
- The **Edit step…** button on the selected step in [`CnFlowSidebar`](./cn-flow-sidebar.md).
- Programmatically: set `useFlowStore().editingNodeId`.

## Draft semantics

Edits land on a draft. **Done** commits it to the store (`setNodeConfigById`
+ `setNodeName`), **Cancel** discards it, **Remove step** deletes the node.
A field holding unparseable JSON disables Done and says so next to the field
— the step never receives a broken configuration.

## Reference fields render as pickers

When the engine declares a field with a reference (`configFields`:
`{key, type, reference: {register, schema}}`), the dialog renders a select
over that register/schema — object names as labels, uuids as values — instead
of a text box. A stored value not in the loaded page is preserved as a
synthesised option, so an existing configuration is never blanked, and a
picker that fails to load degrades to the raw value with Advanced as the
fallback. `configFields` beats `configKeys` when both are present; the engine
owns the vocabulary either way.

## An app can replace this dialog per node type

[`registerFlowNodeEditor`](../utilities/register-flow-node-editor.md) maps a
node type to a custom editor component — the real Synchronization dialog for
`synchronization-run`, the Mapping editor for `apply-mapping` — under the
same draft contract. This generic dialog is the fallback for every type
without one.

## Why the widgets are derived, and why Advanced exists

The catalogue publishes each step's id, name, description and `configKeys` —
but **no per-key schema**. A hand-written form per step type is exactly how
the previous builder ended up understanding four step types and silently
ignoring every other app's. Deriving the widget from the value works for
every step the engine has now and every one an app adds later — and the
collapsed **Advanced: edit as JSON** section keeps the whole document
editable, so nothing a node understands is ever out of reach. `$`-prefixed
keys are authoring annotations and live only there.
