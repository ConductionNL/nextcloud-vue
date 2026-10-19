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
| `maxDepth` | `Number` | `3` | How deep the tree indents before it flattens. Mirrors `savedViewTree.maxDepth`. Flattening is about indentation only: a view past the bound still renders. |
| `counts` | `Object` | `null` | How many records each view matches, keyed by view id (or slug). A view with a number shows it after its name, as "Name (12)". A view can also carry its own `count`. `null` shows no counts. On a `CnIndexPage`, set `viewCounts` and the page fetches them. |

## Events

| Event | Payload | Description |
|---|---|---|
| `apply` | View object | A view entry was clicked; apply its stored state. |
| `save-request` | — | "Save current view…" clicked; open the save dialog. |
| `delete-request` | View object | A view's delete entry was clicked; confirm and delete. Not rendered for a seeded view: a view the product ships is one a user may copy and not remove. |

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

## Views shared with the user

A view carries `@self.access`: `owner`, `write` or `read` (OpenRegister `view-group-share`, `GET /api/views` returns the user's own views, public views and views shared with one of the user's groups). A view without it counts as `owner` when its `owner` is the current user and as `read` otherwise.

When any view is shared with the user, the list is split under two captions, **My views** and **Shared with me** (seeded views stay on top, with no caption). A shared row names the sharing group after the view name. With nothing shared the list renders as before. Applying a shared view works as for an own view.

| Access | Row actions | Event |
|--------|-------------|-------|
| `owner` | Share, Delete | `share-request(view)`, `delete-request(view)` |
| `owner`, `write` | Presentation: how the view shows (table, board, calendar) | `presentation-request(view)` |
| `write` | Save the current view to it (no delete, no share) | `update-request(view)` |
| `read` | Save as my view (no edit, no delete) | `copy-request(view)` |

`CnIndexPage` handles all three: `update-request` PUTs the query and presentation only (never `sharedWith` or `owner`, so the audience cannot change), `copy-request` stores a personal copy and leaves the original, `share-request` opens [`CnSavedViewShareDialog`](./cn-saved-view-share-dialog.md).

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

## Board look

Under the board look the views render as a row of chips on the ground, each with its count (`counts`) and `aria-pressed`, the one named by `selectedViewId` filled. The menu stays for managing views and is labelled "Save view".
