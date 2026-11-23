## ADDED Requirements

### Requirement: Related objects can start with configured link rows

The related-objects card MUST draw its `links` above the related objects. A row MUST be drawn only once all of its label's placeholders are filled from its endpoint.

#### Scenario: The lead's related links
- GIVEN links "Prospect data from the KVK", "{earlier}" and "Hours on this lead: {hours}" over a summary endpoint
- THEN the card starts with those three rows, filled

### Requirement: A related section shows once its own request answered

When a section has answered and others are still loading, the card MUST name the sections still loading instead of showing "Loading …".

#### Scenario: Slow uses and used
- GIVEN relations and files answered empty, and uses and used still loading
- THEN the card reads "Still loading: Objects"
