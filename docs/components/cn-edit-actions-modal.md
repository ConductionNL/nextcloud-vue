# CnEditActionsModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the **action buttons** of
the active page in the working manifest copy (ADR-041): add, remove, reorder,
relabel, re-icon and re-target the page's `config.actions[]` — the quick buttons
and overflow Actions items the page renders. All edits mutate the passed
`working` copy **only**.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit
actions…" item. Each action carries a `type` (`open-page` / `navigate` /
`open-modal` / `handler`) selected via an `NcSelect` (with `inputLabel`); the
target field's label adapts to the type, and the icon is picked with
[CnIconBrowser](./cn-icon-browser.md) rather than typed.

A page with no actions yet shows a hint pointing at the footer's "Add action",
so the empty body doesn't read as a broken modal.

## Import

```js
import { CnEditActionsModal } from '@conduction/nextcloud-vue'
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `working` | `Object` | `null` | The working manifest copy whose active-page `config.actions[]` is edited in place. |
| `pageId` | `String` | `''` | The active page's id; selects which page's actions to edit. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `close` | — | Emitted when the modal is dismissed or "Done" is clicked. |
