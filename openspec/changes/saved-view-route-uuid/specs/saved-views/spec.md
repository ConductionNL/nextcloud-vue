## ADDED Requirements

### Requirement: The address may name a view by its uuid

`?savedView=` SHALL apply the view whose id, slug or uuid it names.

#### Scenario: A menu entry with the uuid
- **GIVEN** a view with id 3 and uuid 551f656a-…
- **WHEN** the page opens on `?savedView=551f656a-…`
- **THEN** that view SHALL be applied
