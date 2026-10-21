# week-view Delta: week-view

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [week-view](../../)

## ADDED Requirements

### Requirement: A week view reads its week from an endpoint and moves through weeks

With `content.endpointSource` the week strip SHALL read its items from that endpoint, `@range.from` and `@range.to` being
the first day shown and the day after the last, and SHALL read again when the shown days change. Previous and next
SHALL move a week, or a day in Today mode, and back to today SHALL show the current week. An item SHALL show its time
from `timeFields`, a badge from `variantMap` and the `itemActions` whose `visibleWhen` holds on the item, with
`@item` tokens filled from it. Notices and the summary list SHALL read the answer.

#### Scenario: A teacher looks at next week

- **GIVEN** the week of 5 October
- **WHEN** the teacher presses next
- **THEN** the endpoint is read for 12 to 17 October and the lessons of that week are shown

#### Scenario: A cancelled lesson

- **GIVEN** a lesson whose lifecycle is cancelled, mapped to a muted error badge
- **WHEN** the week renders
- **THEN** the lesson shows "Cancelled" and its title struck through
