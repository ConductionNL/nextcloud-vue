## ADDED Requirements

### Requirement: The ai-chat widget stands in a titled card and keeps its controls

The `ai-chat` widget SHALL be drawn by the detail host in a card with the widget's title. In that card the chat panel SHALL draw no titlebar of its own; its session controls SHALL be offered in the card's Actions menu. The widget MAY name a pill for the card's title row, a note above the input, the input's placeholder and a label for the send button.

#### Scenario: the assistant beside a case
- **GIVEN** a case page placing `ai-chat` titled "Assistent" with `pill` "Hermiq", a `note` and `sendLabel` "Vragen"
- **WHEN** the chat backend answers its health probe
- **THEN** the card SHALL read "Assistent" with a "Hermiq" pill and no agent titlebar
- **AND** the card's Actions menu SHALL offer the conversations, read aloud and the other agents
- **AND** the note SHALL stand above the input and the send button SHALL read "Vragen"
