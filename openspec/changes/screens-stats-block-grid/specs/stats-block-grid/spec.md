# stats-block-grid Delta: screens-stats-block-grid

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stats-block-grid](../../)

## Purpose

Let one dashboard card hold several stat figures of any source kind, in a grid.

## ADDED Requirements

### Requirement: A stats-block can hold stat tiles in a grid

A `stats-block` widget with `layout: "grid"` and a non-empty `stats` list SHALL draw one stat tile per entry of `stats`, each entry being the `content` a `type: "stat"` widget takes, so that every source kind a stat
supports (aggregate, `ratio`, `elapsed`, `computed`, `weighted`, `endpoint`) resolves. The tiles SHALL sit in
`columns` columns (default 2, clamped to 1 to 4) inside the one card, without a box of their own. Such a widget SHALL
NOT be reported as missing a `dataSource` or `entries`. Without `layout: "grid"` the widget SHALL render as before.

#### Scenario: Je week tot nu toe

- **GIVEN** a stats-block titled "Je week tot nu toe" with `layout: "grid"` and three stats: a count, an elapsed
  average (`occurredAt` to `resolvedAt`, two tickets of 1 and 2 days) and a count
- **WHEN** the dashboard renders it
- **THEN** the card shows three tiles in two columns, the second reading "1,5 dagen"
