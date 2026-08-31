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

## Choosing a variant

`variant` should match the host widget's `titleIconVariant`, so an empty widget still reads as the same widget. Colours resolve to Nextcloud tokens and the circle's tint is derived from the same token with `color-mix()` — never a frozen `rgba()`, which would ignore a re-themed palette (NL Design System).

<GeneratedRef />
