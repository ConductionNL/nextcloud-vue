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

## Events

| Event | Payload | Description |
|---|---|---|
| `apply` | View object | A view entry was clicked; apply its stored state. |
| `save-request` | — | "Save current view…" clicked; open the save dialog. |
| `delete-request` | View object | A view's delete entry was clicked; confirm and delete. |

## States

- **Loading** — `loading: true` shows a caption instead of the list.
- **Empty** — no views and not loading shows "No saved views yet".

## See also

- `CnSaveViewDialog` — the companion "Save current view…" dialog.
- `CnIndexPage` — `allowSavedViews` prop wires the full flow (fetch, apply via route query, save, delete-with-confirm).
- `utils/savedViewHelpers.js` — pure state ↔ route-query ↔ OR-payload serializers.
