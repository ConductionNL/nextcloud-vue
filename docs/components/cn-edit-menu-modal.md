# CnEditMenuModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the **left navigation**
of the working manifest copy (ADR-041): add, remove, reorder, relabel, re-icon
and re-route `menu[]` entries. All edits mutate the passed `working` copy
**only** — never the base manifest, which the editor holds separately until Save.

Opened by [CnOpenBuildEditButton](./cn-open-build-edit-button.md)'s "Edit menu…"
action. Uses `NcTextField` (no `NcSelect`), so no input-label wiring is required.

## Import

```js
import { CnEditMenuModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose `menu[]` is edited in place. Never the base. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
