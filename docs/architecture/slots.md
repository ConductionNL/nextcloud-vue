# Slot naming conventions

All components follow a consistent slot naming scheme. This page documents the conventions so consumer apps use the correct slot names.

## Header action slots

Components that have a header area with action buttons use one of these patterns:

| Slot name | Used by | Purpose |
|-----------|---------|---------|
| `#header-actions` | Pages, widgets, detail cards | Buttons in the component header (right side) |
| `#actions` | Simple cards, sections | Buttons in the card/section header |

**Rule:** Page-level and widget-level components use `#header-actions`. Simple card components use `#actions`.

### Page-level (`#header-actions`)

```vue
<CnIndexPage>
  <template #header-actions>
    <NcButton @click="doSomething">Extra action</NcButton>
  </template>
</CnIndexPage>
```

Components: `CnIndexPage`, `CnDetailPage`, `CnDashboardPage`, `CnActionsBar`

### Widget-level (`#header-actions`)

```vue
<CnWidgetWrapper title="My widget">
  <template #header-actions>
    <NcButton @click="refresh">Refresh</NcButton>
  </template>
  <!-- widget content -->
</CnWidgetWrapper>
```

Components: `CnWidgetWrapper`, `CnObjectDataWidget`, `CnObjectMetadataWidget`, `CnDetailCard`

### Per-widget actions on CnDashboardPage (`#widget-{widgetId}-actions`)

`CnDashboardPage` passes per-widget action slots through to each widget's `CnWidgetWrapper#header-actions`:

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

### Card-level (`#actions`)

```vue
<CnConfigurationCard title="API settings">
  <template #actions>
    <NcButton @click="save">Save</NcButton>
  </template>
</CnConfigurationCard>
```

Components: `CnCard`, `CnConfigurationCard`, `CnVersionInfoCard`, `CnSettingsSection`, `CnRegisterMapping`, `CnObjectCard`, `CnItemCard`

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
