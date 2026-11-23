## ADDED Requirements

### Requirement: A card can end with other widgets

A detail card SHALL draw the widgets its `content.trailWidgetIds` names inside the card, after its own content, without
a card of their own, and only those whose `visibleWhen` holds against the record and its page context.

#### Scenario: goals under the plan
- **GIVEN** the Zaakplan card with `trailWidgetIds: ["case-goals"]`
- **THEN** the goals row is drawn inside the Zaakplan card, under the plan rows
