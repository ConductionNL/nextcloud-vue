---
sidebar_position: 6
---

# Cards vs Widgets

The library has **two families** of content surface. Picking the right one keeps detail pages and dashboards consistent and gives every full surface the same affordances.

## The two families

| | **Card** | **Widget** |
|---|---|---|
| **What it is** | A single-headline / simple read-only surface | A full content surface a user works with |
| **Chrome** | [`CnDetailCard`](../components/cn-detail-card.md) (title + optional icon, collapsible) | [`CnWidgetWrapper`](../components/cn-widget-wrapper.md) (title + content + the shared **Actions menu**) |
| **Actions menu** | ❌ none | ✅ Refresh · Documentation · Request a feature (via [`CnActionsMenu`](../components/cn-actions-menu.md)) |
| **Examples** | KPI cards, stats blocks, single-metric tiles, info cards, object **metadata** | `data`, `related`, `object-table`, `card-grid`, `form-renderer`, `map-viewer`, `integration`, chart |

The litmus test the team uses: **anything that shows a single headline number is a Card; anything a user reads a list/table/grid from or interacts with is a Widget.**

## What a Widget gets for free

Because every Widget renders on `CnWidgetWrapper`, it automatically carries the shared overflow **Actions** menu:

- **Refresh** — always shown; broadcasts on the `cn:widget:refresh` event bus (page surfaces use `cn:page:refresh`).
- **Request a feature** — always shown; opens `CnSuggestFeatureModal`, auto-resolving the app + repo from the `CnAppRoot` injects.
- **Documentation** — shown only when a `documentation-url` is provided.
- Per-widget extras via the `#action-items` slot (e.g. the **Metadata** item on `CnObjectDataWidget`).

Cards deliberately omit all of this — they are passive.

## Authoring a Widget

Render `CnWidgetWrapper` as the component's **root** and put the content inside its default slot:

```vue
<template>
  <CnWidgetWrapper
    :title="title"
    :widget-id="widgetId"
    :documentation-url="documentationUrl">
    <template #actions><!-- inline buttons (left of the menu) --></template>
    <template #action-items><!-- extra menu items --></template>
    <!-- widget content -->
  </CnWidgetWrapper>
</template>
```

In the JSON manifest grid, the entry-level `title` and `documentationUrl` flow into the widget so the chrome renders them without per-widget props:

```json
{ "widgetKey": "related", "title": "Related", "gridWidth": 12 }
```

## Authoring a Card

Use `CnDetailCard` (or a card primitive like `CnKpiGrid` / `CnStatsBlock`). No Actions menu:

```vue
<template>
  <CnDetailCard :title="title" :collapsible="true">
    <!-- single-headline / read-only content -->
  </CnDetailCard>
</template>
```

## The default detail page

A schema-driven `type: "detail"` page renders the **data** Widget with the **related** Widget beneath it. Object **metadata** is a Card — it is reached on demand from the data Widget's **Metadata** action item (a small modal), rather than occupying a permanent slot. See [`CnDetailPage`](../components/cn-detail-page.md), [`CnObjectDataWidget`](../components/cn-object-data-widget.md), [`CnRelatedObjectsWidget`](../components/cn-related-objects-widget.md) and [`CnObjectMetadataModal`](../components/cn-object-metadata-modal.md).
