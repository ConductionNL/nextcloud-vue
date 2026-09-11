# CnEditActionsModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the **declarative
actions** of the active page in the working manifest copy (ADR-041): add,
remove, reorder, relabel, re-icon and re-target them. All edits mutate the
passed `working` copy **only**.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit
actions…" item. Each action carries a `type` (`open-page` / `navigate` /
`open-modal` / `handler`) selected via an `NcSelect` (with `inputLabel`); the
target field's label adapts to the type, and the icon is picked with
[CnIconBrowser](./cn-icon-browser.md) rather than typed.

A surface with no actions yet shows a hint pointing at the footer's "Add
action", so the empty body doesn't read as a broken modal.

## Two surfaces

The manifest carries two action arrays under a page's `config`, and they are not
interchangeable:

| Key | Renders as | Read by |
| --- | --- | --- |
| `headerActions[]` | the Actions menu in the page header | `CnDashboardPage`, `CnIndexPage`, `CnDetailPage` |
| `actions[]` | the `⋯` menu on every table row | `CnIndexPage` only |

`headerActions` is the default and the only choice on a page without rows. An
index page gets a picker for both. Dispatch is the shared
`utils/actionsDispatcher.js` either way, so the same action shape works on both.

Actions found under `config.actions` on a page type that renders no rows are
dead config — earlier versions of this modal wrote every action there. The modal
says so and offers to move them into the Actions menu.

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
