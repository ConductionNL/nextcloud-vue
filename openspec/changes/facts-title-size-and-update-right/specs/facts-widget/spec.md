## ADDED Requirements

### Requirement: A facts title row can take a size

A facts entry drawn `as: "title"` MAY declare `size`, a number of pixels. The title MUST then be drawn at that font size; without `size` it keeps the card's own.

#### Scenario: The Termijn card's figure

@e2e exclude an inline font size asserted on the rendered row by tests/components/CnFactsWidgetTermCard.spec.js; the board measure checks the pixels.
- **WHEN** the Termijn card declares `{ as: "title", path: "slaDeadline", format: "longdatetime", size: 26 }`
- **THEN** the term is drawn at 26px

### Requirement: A facts action can ask for the update right

An action in `actions` or `emptyActions` MAY declare `requires: "update"`. The card MUST leave it out when OpenRegister's caller scope on the page's register and schema does not include update, and MUST draw it while that scope cannot be read. The server MUST remain the authority on the write.

#### Scenario: A reader sees no Termijn instellen

@e2e exclude the scope is mocked; asserted by tests/components/CnFactsWidgetTermCard.spec.js.
- **WHEN** a user whose scope on pipelinq/ticket holds only read opens a request
- **THEN** neither "Termijn instellen" nor "Bestaande zaak koppelen" is drawn
