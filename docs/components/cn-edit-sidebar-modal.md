# CnEditSidebarModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the **right sidebar** of
the active page in the working manifest copy (ADR-041): toggle whole-sidebar
visibility and the visibility of each declared tab (`page.config.sidebar`). All
edits mutate the passed `working` copy **only** — never the base manifest.

Opened by [CnOpenBuildEditButton](./cn-open-build-edit-button.md)'s "Edit
sidebar…" action. Uses `NcCheckboxRadioSwitch` (no `NcSelect`), so no input-label
wiring is required.

## Import

```js
import { CnEditSidebarModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose active-page sidebar is edited in place. |
| `pageId` | `String` | `''` | The active page's id; selects which page's `config.sidebar` to edit. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
