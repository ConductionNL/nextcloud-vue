---
title: CnSavedViewsControl
---

# CnSavedViewsControl

The toolbar entry to saved views. Rendered by `CnIndexPage` in its actions bar when the page opts in via `allowSavedViews`.

It is a **Save view** button (nl "Weergave opslaan") that asks to save the current filters, and, under the board look, the saved views as a row of chips that apply them, each with its count when one is known. Listing, editing, sharing, deleting and adding a filter to the app menu live in the filters sidebar: see [`CnSavedViewsPanel`](./cn-saved-views-panel.md). After a save `CnIndexPage` opens the sidebar, so the new filter is in view.

Purely presentational: the parent owns fetching (`GET /apps/openregister/api/views`) and every write.

## Try it

```vue
<CnSavedViewsControl
  :views="savedViews"
  :current-user-id="currentUserId"
  :selected-view-id="appliedId"
  @apply="onApplyView"
  @save-request="showSaveDialog = true" />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `views` | `Array` | `[]` | View API objects, defaults included. |
| `loading` | `Boolean` | `false` | True while the parent fetches. |
| `currentUserId` | `String` | `''` | The signed-in user id. |
| `maxDepth` | `Number` | `3` | Mirrors `savedViewTree.maxDepth`; only the top level gets a chip. |
| `counts` | `Object` | `null` | Record counts by view id or slug, shown on the chips. |
| `selectedViewId` | `String` | `''` | The applied view; its chip renders selected. |
| `chips` | `Boolean` | `true` | Whether the board look draws the views as chips. `false` keeps only Save view (CnIndexPage `config.savedViewChips: false`), for a page whose views live in the side panel's Weergaven tab. |

## Events

| Event | Payload | Description |
|---|---|---|
| `apply` | View | A chip was clicked. |
| `save-request` | none | Save view was clicked. |
