## ADDED Requirements

### Requirement: The stage primary button draws its action's icon

When the record's stage names a primary action (`config.primaryActionByStage`) that declares an MDI `icon`, the primary button SHALL draw that icon before its label. An action without an icon SHALL keep the plain button.

#### Scenario: A quote in draft offers Send to client with its icon
- **GIVEN** a detail page with `primaryActionByStage: { draft: "send-quote" }` and a header action `send-quote` with `icon: "SendOutline"`
- **WHEN** the record's status is `draft`
- **THEN** the primary button SHALL read "Send to client" and draw the SendOutline icon

@e2e exclude A rendering rule covered by the component test; no flow changes.
