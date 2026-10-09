import GeneratedRef from './_generated/CnWidgetEmptyState.md'

# CnWidgetEmptyState

The designed empty state for a dashboard widget: a tinted circular icon, a short headline, an optional explanatory line, and an optional single call to action.

It exists because an empty widget used to render whatever its content component left behind. Most visibly, an empty list widget rendered a `CnDataTable` with no rows — and a table with no rows still paints its `<thead>`, which reads as a full-width grey bar floating in the middle of an otherwise blank card.

The state sizes to the widget rather than claiming a fixed block, so it never forces a scrollbar on a short tile; where even that is too tall, `compact` collapses it to a single quiet row.

## Usage

```vue
<CnWidgetEmptyState
  :name="t('myapp', 'No open cases')"
  :description="t('myapp', 'Cases assigned to you will appear here.')"
  variant="primary">
  <template #action>
    <NcButton @click="create">{{ t('myapp', 'New case') }}</NcButton>
  </template>
</CnWidgetEmptyState>
```

Inside a fit-measured cell, drop to the compact row instead:

```vue
<CnWidgetEmptyState :name="emptyText" compact />
```

## Sizes and the board look

`size` is `widget` (the default look: 48px circle, 14px name) or `card` (the board empty state: 48px grey circle holding a 24px icon, 16px bold name, 14px grey description up to 480px wide, the action 6px below, 28px 20px padding). Left unset, it is `card` when the app takes the board look (`cnLook` is `board`, provided by `CnAppRoot`) and `compact` is off, and `widget` otherwise. An empty state is never drawn with a dashed border: only a file drop zone is dashed.

The library's own empty states (`CnIndexPage`, `CnCardGrid`, `CnDashboardPage`, `CnObjectKanban`, `CnDetailWidgetHost`, `CnRelatedObjectsWidget`, `CnTabsWidget`, `CnObjectList`, `CnFilesBrowser`) render this component at `card` size in the board look and keep `NcEmptyContent` in the Nextcloud look. Each component's `empty` slot still wins.

## Choosing a variant

`variant` should match the host widget's `titleIconVariant`, so an empty widget still reads as the same widget. Colours resolve to Nextcloud tokens and the circle's tint is derived from the same token with `color-mix()` — never a frozen `rgba()`, which would ignore a re-themed palette (NL Design System).

<GeneratedRef />
