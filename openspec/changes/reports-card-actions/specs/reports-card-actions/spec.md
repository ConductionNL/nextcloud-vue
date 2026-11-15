## ADDED Requirements

### Requirement: A report card can carry actions of its own

A reports page with `cardActions` SHALL draw on every available card the actions whose `visibleWhen` holds for the card
with its `cardState` row as `state`, SHALL run a clicked action with the card as the object its tokens read, and SHALL
read the card states again after it ran.

#### Scenario: subscribing to a report
- **GIVEN** a Subscribe action shown while `state.frequency` is empty, and no subscription to AI oversight
- **WHEN** the person presses Subscribe on the AI oversight card
- **THEN** the action posts `{ report: "AiOversight", ... }` and the card then offers Cancel instead
