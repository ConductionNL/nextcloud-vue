# Slot naming conventions

All components follow a consistent slot naming scheme. This page documents the conventions so consumer apps use the correct slot names.

## Header action slots

All components that have a header area with action buttons use the standard `#actions` slot.

| Slot name | Used by | Purpose |
|-----------|---------|---------|
| `#actions` | All page, widget, and card components | Buttons in the component header (right side) |

### Usage

```vue
<CnIndexPage>
  <template #actions>
    <NcButton @click="doSomething">Extra action</NcButton>
  </template>
</CnIndexPage>
```

```vue
<CnDetailPage>
  <template #actions>
    <NcButton @click="save">Save</NcButton>
  </template>
</CnDetailPage>
```

```vue
<CnWidgetWrapper title="My widget">
  <template #actions>
    <NcButton @click="refresh">Refresh</NcButton>
  </template>
  <!-- widget content -->
</CnWidgetWrapper>
```

```vue
<CnDetailCard title="Card title">
  <template #actions>
    <NcButton @click="doSomething">Action</NcButton>
  </template>
</CnDetailCard>
```

Components using `#actions`: `CnIndexPage`, `CnDetailPage`, `CnDashboardPage`, `CnActionsBar`, `CnWidgetWrapper`, `CnObjectDataWidget`, `CnObjectMetadataWidget`, `CnDetailCard`, `CnCard`, `CnConfigurationCard`, `CnVersionInfoCard`, `CnSettingsSection`, `CnRegisterMapping`, `CnObjectCard`, `CnItemCard`, `CnMassActionBar`

### Per-widget actions on CnDashboardPage (`#widget-{widgetId}-actions`)

`CnDashboardPage` passes per-widget action slots through to each widget's `CnWidgetWrapper#actions`:

```vue
<CnDashboardPage :widgets="widgets" :layout="layout">
  <template #widget-my-work="{ item }">
    <MyWorkList />
  </template>
  <template #widget-my-work-actions>
    <NcButton @click="refreshWork">Refresh</NcButton>
  </template>
</CnDashboardPage>
```

The slot name follows the pattern `widget-{widgetId}-actions` where `widgetId` matches the widget's `id` in the widgets array.

## Row action slots

| Slot name | Used by | Purpose |
|-----------|---------|---------|
| `#row-actions` | `CnDataTable`, `CnIndexPage` | Per-row action buttons |
| `#card-actions` | `CnCardGrid` | Per-card action buttons |
| `#actions-header` | `CnDataTable` | Column header for the actions column |

## Mass action slots

| Slot name | Used by | Purpose |
|-----------|---------|---------|
| `#mass-actions` | `CnActionsBar`, `CnIndexPage` | Extra mass action buttons (scoped: `count`, `selectedIds`) |
| `#action-items` | `CnActionsBar`, `CnIndexPage` | Extra items in the top action bar |

## Dialog footer slots

| Slot name | Used by | Purpose |
|-----------|---------|---------|
| `#actions-left` | `CnAdvancedFormDialog`, `CnTabbedFormDialog` | Left-side footer buttons |
| `#actions-right` | `CnAdvancedFormDialog`, `CnTabbedFormDialog` | Right-side footer buttons |

## Translation

All label props use `t()` from `@nextcloud/l10n` as defaults (sentence case). Consumer apps can override any label by passing a string prop:

```vue
<!-- Uses default translated label -->
<CnDeleteDialog :item="item" />

<!-- Override with custom label -->
<CnDeleteDialog :item="item" :cancel-label="t('myapp', 'Go back')" />
```

See [ADR-007](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-007-i18n.md) for the full i18n specification.
