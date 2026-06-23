# CnEditPagesModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the app's **pages** in
the working manifest copy (ADR-041): add, remove, reorder, relabel, re-type and
re-route the manifest's `pages[]`. All edits mutate the passed `working` copy
**only**.

Opened by [CnOpenBuildEditButton](./cn-open-build-edit-button.md)'s "Edit
pages…" item. Each page's `id` is the vue-router route name (referenced by menu
items' `route`), so it is shown **read-only** to avoid silently breaking menu
links; the editable fields are Title, Type (an `NcSelect` with `inputLabel` over
the closed `dashboard` / `index` / `detail` / `custom` enum) and Route.

## Import

```js
import { CnEditPagesModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose `pages[]` is edited in place. Never the base. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
