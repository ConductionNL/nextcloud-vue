# CnEditSidebarModal

Isolated `NcModal` (ADR-004 modal isolation) that edits the **right sidebar** of
the active page in the working manifest copy (ADR-041), through
`page.config.sidebar`. All edits mutate the passed `working` copy **only** —
never the base manifest.

Opened by [CnBuildiqEditButton](./cn-buildiq-edit-button.md)'s "Edit
sidebar…" action.

## The body follows the page type

`config.sidebar` means two different things, so the modal offers two different
bodies:

| Page type | The sidebar is | What the modal edits |
| --- | --- | --- |
| `index` | the Search & columns panel (`CnIndexSidebar`) | visibility, the built-in Metadata column group (`showMetadata`), which tab opens first (`search.defaultTab`), and the extra `columnGroups[]` |
| everything else | the object sidebar (`CnObjectSidebar`) | visibility, the header `title` / `subtitle`, the `register` / `schema` it reads, registry mode (`useRegistry` + `excludeIntegrations`), and the declared `tabs[]` — label, id, content widget, per-tab visibility |

`useRegistry` gives one tab per registered integration provider instead of the
five built-ins (files, notes, tags, tasks, audit trail). `CnObjectSidebar` lets a
declared `tabs[]` win over it and logs a warning; the modal says so in place
instead. Note that `CnDetailPage` publishes `useRegistry === true`, so an unset
flag means the built-ins even though `CnObjectSidebar`'s own prop defaults true.

An index sidebar has no tabs, so the Tabs section is absent there. `facets` is
absent too, and deliberately: it is the live facet data the page feeds the panel
(`{ field: { values: [...] } }`), not something an author writes.

A column group is `{ id, label, columns: [{ key, label }] }`. The modal edits the
keys as one comma-separated list; a key that survives an edit keeps whatever
label it had, and a new key labels itself.

The visibility switch reports the gate the page type actually reads.
`CnIndexPage` mounts nothing without an explicit `sidebar.enabled === true`,
while `CnDetailPage` treats both flags as on when absent. Turning it on always
writes **both** `show` and `enabled`, so the result holds on either page type.

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
