---
sidebar_position: 14
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnRowActions.md'

# CnRowActions

Per-row action menu for tables and cards. Renders as a `⋯` button that opens a dropdown with the configured actions. Automatically marks destructive actions (e.g., Delete) with a danger style.

**Wraps**: NcActions, NcActionButton, NcActionLink

## Try it

<Playground component="CnRowActions" />

![CnRowActions dropdown showing View, Edit, Copy, and Delete options for the focused row](/img/screenshots/cn-row-actions.png)

## Anatomy

```
                      +----------------+
                      |  👁 View       |  ← navigate to detail
                      |  ✏ Edit        |  ← open edit form
[ ⋯ ]  ──opens──▶    |  ⊕ Copy        |  ← duplicate the object
                      |  ─────────────  |  ← divider before destructive actions
                      |  🗑 Delete     |  ← destructive: shown in red
                      +----------------+
    ↑
trigger button (last cell of every row)
```

| Region | Description |
|--------|-------------|
| **Trigger button** | `⋯` icon button placed in the last column of the row; always visible on hover |
| **Action items** | Each action renders with an optional icon and label |
| **Divider** | Automatically inserted before the first action marked `destructive: true` |
| **Destructive actions** | Shown in the Nextcloud danger color to signal irreversible operations |

## Usage

```vue
<CnRowActions
  :actions="[
    { label: 'View',   icon: EyeIcon,         handler: (row) => openDetail(row) },
    { label: 'Edit',   icon: PencilIcon,       handler: (row) => openEditDialog(row) },
    { label: 'Copy',   icon: ContentCopyIcon,  handler: (row) => copyRow(row) },
    { label: 'Delete', icon: DeleteIcon,       handler: (row) => confirmDelete(row), destructive: true },
  ]"
  :row="row"
  @action="onAction" />
```

The `action` event can be used as an alternative to `handler` functions:

```js
function onAction({ action, row }) {
  // action is the label string of the clicked action
  if (action === 'Edit') openEditDialog(row)
  if (action === 'Delete') confirmDelete(row)
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | Array | `[]` | Array of action definition objects (see Action definition below) |
| `row` | Object | `null` | The row data object — passed as-is in the `action` event payload so handlers can access it |
| `primary` | Boolean | false | Whether to use primary styling for the action menu trigger |
| `menuName` | String | `null` | Label shown on the action menu trigger button |

#### Action definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | String | ✓ | Display text for the action item. Also used as the `action` key in the emitted `action` event, and slugified into the entry's `data-testid` (`cn-action-item-<slug>`) and render key. |
| `id` | String | — | The action's id, passed as `id` in the `action` event payload. |
| `builtin` | Boolean | — | Set by CnIndexPage on its built-in View / Edit / Copy / Delete (ids `view`, `edit`, `copy`, `delete`). A built-in's `data-testid` is `cn-action-item-<id>` in every locale, its render key `builtin:<id>`, and its `action` payload carries `builtin: true`, so an app action with the same id stays a separate entry. Not for app actions. |
| `icon` | Object\|String | — | The icon to render. A **component** (e.g. a vue-material-design-icons component) is rendered directly. A **string** is treated as a `CnIcon` registry name (PascalCase, e.g. `"Eye"`) and resolved via `registerIcons()`, falling back to the help-circle when unregistered — this lets manifest (JSON) actions declare icons by name. |
| `handler` | Function | — | Called with the `row` value when the action is clicked: `(row) => void` |
| `disabled` | Boolean\|Function | — | When `true`, or when a function returning `true` for the given row, the item is not clickable |
| `visible` | Boolean\|Function | — | Controls whether the item appears in the menu at all. Omit for "always shown". Pass `false` or a function returning `false` for the row to hide it. Useful for state-dependent actions (e.g. show *Publish* only when the row is unpublished). |
| `visibleWhen` | Object | — | The JSON form of the same question, for a manifest, which cannot hold a function: `{ field, op, value }` against the row, or an `all` / `any` composition of those. Evaluated synchronously, so only LOCAL conditions decide anything — one naming an `endpoint` or a `source` cannot be answered here and leaves the action shown rather than silently dropping it. Applied alongside `visible`; both must pass. |
| `title` | String\|Function | — | Native tooltip shown on hover. Accepts a string or a function `(row) => string`. Useful for explaining *why* a `disabled` entry is disabled. |
| `destructive` | Boolean | — | When `true`, renders the action in danger color |
| `href` | String\|Function | — | Renders the entry as a real link to this URL (`NcActionLink`). Accepts a string or a function `(row) => string`. |
| `to` | String\|Object\|Function | — | Renders the entry as a real link to this vue-router location (a path or `{ name, params }`, or a function `(row) => location`). The href is resolved through the router; a plain click routes in place, a middle/ctrl click opens a new tab. When the router cannot resolve it, the entry stays a button. |
| `linkTarget` | String | — | The link's `target`, e.g. `_blank`. |

#### Link actions

An action whose only job is to navigate should be a link, so the user can middle-click it, open it in a new tab or copy its address. Give it `to` (in-app) or `href` (URL) instead of a navigating `handler`:

```vue
<CnRowActions
  :actions="[
    { label: 'View', icon: 'Eye', to: (row) => ({ name: 'LeadDetail', params: { id: row.id } }) },
    { label: 'Website', icon: 'Web', href: (row) => row.url, linkTarget: '_blank' },
    { label: 'Delete', icon: 'Delete', handler: deleteRow, destructive: true },
  ]"
  :row="row" />
```

A link entry still emits `action`, so a host listening to it keeps working, but its `handler` is not called: the link does the navigating. A ctrl/cmd/shift click on a link opens a new tab and emits nothing, so a host's side effects never run in the tab the user is leaving. A disabled entry always renders as a button. CnIndexPage fills `to` / `href` in automatically for manifest actions with `type: "navigate"`, `type: "open-page"` or `handler: "navigate"`.

#### Conditional visibility example

```vue
<CnRowActions
  :actions="[
    { label: 'Publish',   icon: PublishIcon,    handler: publishRow,   visible: (row) => !row.published },
    { label: 'Depublish', icon: PublishOffIcon, handler: depublishRow, visible: (row) =>  row.published },
    { label: 'Delete',    icon: DeleteIcon,     handler: deleteRow,    destructive: true },
  ]"
  :row="row" />
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ action, row, id?, builtin? }` | Emitted when an action item is clicked. `action` is the label, `row` the value of the `row` prop, `id` the action's id when it has one, and `builtin: true` marks a CnIndexPage built-in. |

The visibility rule (`visible` and a local `visibleWhen`), the testid, the render key and the payload are shared with [CnContextMenu](./cn-context-menu.md), so a CnIndexPage row's actions menu and its right-click menu always list the same entries.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnRowActions.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnRowActions/CnRowActions.vue) and update automatically whenever the component changes.

<GeneratedRef />

## Board look

Under the board look the menu is always one 34px menu button (three dots), named "Actions for &lt;title&gt;" from `rowLabel`, or by `triggerLabel` when the page names the whole label.
