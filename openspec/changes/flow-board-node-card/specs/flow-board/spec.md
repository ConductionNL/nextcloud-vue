## ADDED Requirements

### Requirement: A flow step on the board canvas is a card with its app pill

With `nodeLook: card` the flow board MUST draw each step as a card with the step's name and one pill naming the app that
does the step, followed by the page's short type when the palette gives one, in the palette group's tone. A start step
MUST read "Start".

#### Scenario: A curated step
- GIVEN the palette group Dossiq with pill "dossiq" lists `dossiq.askPerson` with short "persoon vragen"
- WHEN a step of that type is on the canvas
- THEN its card shows the step's name and the pill "dossiq · persoon vragen" in the primary tone

#### Scenario: A step outside the palette
- GIVEN a step whose type no palette group names
- THEN its pill reads the providing app's display name

#### Scenario: The start step
- GIVEN the flow's trigger step
- THEN its pill reads "Start"
