---
title: CnSavedViewsControl
---

# CnSavedViewsControl

Toolbar dropdown listing OpenRegister saved-search views (saved-views-ui). Rendered by `CnIndexPage` in its actions slot when the page opts in via `allowSavedViews`; also usable standalone.

Purely presentational: the parent owns fetching (`GET /apps/openregister/api/views`) and all mutations. The control lists the given `views` and emits intents — `apply` (write the view's stored filters/search/sort into the route query), `save-request` (open a save dialog), `delete-request` (confirm-delete). The delete entry only renders for views owned by `currentUserId`; OpenRegister enforces owner scoping server-side as well.

## Try it

```vue
<CnSavedViewsControl
  :views="savedViews"
  :loading="savedViewsLoading"
  :current-user-id="currentUserId"
  @apply="onApplyView"
  @save-request="showSaveDialog = true"
  @delete-request="onDeleteViewRequest" />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `views` | `Array` | `[]` | View API objects from `GET /apps/openregister/api/views` (`{ id, name, owner, query, … }`). |
| `loading` | `Boolean` | `false` | Shows a "Loading…" caption while the parent fetches. |
| `currentUserId` | `String` | `''` | Signed-in NC user id — gates the per-view delete affordance (`view.owner === currentUserId`). |
| `allowPinning` | `Boolean` | `false` | Whether a view can be pinned into the navigation from here. Only on a page whose views are places. |
| `maxDepth` | `Number` | `3` | How deep the tree indents before it flattens. Mirrors `savedViewTree.maxDepth`. Flattening is about indentation only: a view past the bound still renders. |

## Events

| Event | Payload | Description |
|---|---|---|
| `apply` | View object | A view entry was clicked; apply its stored state. |
| `save-request` | — | "Save current view…" clicked; open the save dialog. |
| `delete-request` | View object | A view's delete entry was clicked; confirm and delete. Not rendered for a seeded view: a view the product ships is one a user may copy and not remove. |
| `pin-request` | View object | A view's pin entry was clicked; pin or unpin it. Only when `allowPinning`. |

## The tree and the labels

Views render in tree order, seeded first, then the reader's own, each
alphabetically, children under their parents. The order is decided by
`utils/buildViewTree.js` rather than in this template, so it can be asserted
without mounting anything.

Indentation is figure spaces in the button label rather than CSS padding: the
row is an `NcActionButton` whose label is read out as text, so a screen reader
gets the same shape a sighted reader does. Leading whitespace is not read out
as structure, so the accessible label says the level in words as well.

A view whose parent this reader cannot see renders at the root and says so. Its
parent may be shared with a group they are not in; sitting at the root it is
otherwise indistinguishable from a view that never had a parent.

The label entries filter the list to one label, and clicking the active one
clears it. They are read from the UNFILTERED view list: read from the filtered
rows, choosing one label would take every other label off the menu.

## States

- **Loading** — `loading: true` shows a caption instead of the list.
- **Empty** — no views and not loading shows "No saved views yet".
- **Nothing for this label** — views exist but the active label matches none.
  Distinct from Empty, because a menu with nothing matching and a menu with
  nothing in it read the same and mean different things.

## See also

- `CnSaveViewDialog` — the companion "Save current view…" dialog.
- `CnIndexPage` — `allowSavedViews` prop wires the full flow (fetch, apply via route query, save, delete-with-confirm).
- `utils/savedViewHelpers.js` — pure state ↔ route-query ↔ OR-payload serializers.
- `utils/buildViewTree.js` — the tree order, the label filter and the labels in use.
- `utils/resolveViewInheritance.js` — what a child view shows once its parents have had their say.
- `utils/viewSlugs.js` — the one name a view is called by from a widget, an export or the API.
- `utils/viewDefaults.js` — the landing view, the columns per role and what a new view starts from.
- `utils/viewActions.js` — the actions a view offers, intersected with what the reader may run.
- `utils/groupRows.js` — grouping a list by one field, with a count per group.
