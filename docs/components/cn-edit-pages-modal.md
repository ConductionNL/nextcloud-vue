# CnEditPagesModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the app's **pages** in
the working manifest copy (ADR-041): add, remove, reorder, relabel, re-type,
re-parent and re-route the manifest's `pages[]`. All edits mutate the passed
`working` copy **only**.

Opened by [CnOpenBuildEditButton](./cn-open-build-edit-button.md)'s "Edit
pages…" item. Pages render as a compact **tree** (`CnPageTreeNode`) mirroring
the menu editor — each page is a one-line row (type icon + title + type) with an
edit **cog** that reveals Title, Type (`dashboard` / `index` / `detail` /
`custom`), Parent and Route; plus reorder, delete and add-sub-page.

The hierarchy comes from each page's **`parent`** (a parent page's id): a page
nests under its parent so an index and its detail visually correlate, and
selecting a parent **builds the child's route up** from the parent's (e.g.
`/leads` → `/leads/:id`). The page `id` (vue-router route name, referenced by
menu links) is shown read-only.

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
