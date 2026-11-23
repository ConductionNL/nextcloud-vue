# connections-panel

## ADDED Requirements

### Requirement: The connections panel draws the board's cards

CnConnectionsPanel MUST draw each connection and each side card 18px in with a 12px radius and a 17px title, the
connection's icon in a 40px square, a rule above the card's foot and above each row that needs attention. A working
connection MUST read "Set up", and the action on a connection that is not set up MUST read "Configure". The filter
field MUST show a search icon.

#### Scenario: Board PqIntegrations

- GIVEN Pipelinq declares Mastodon (configured) and X (not set up)
- WHEN an administrator opens Pipelinq-instellingen, Integraties, in Dutch
- THEN Mastodon's badge and its chip read "Ingesteld"
- AND X's card offers "Instellen"
- AND each card's title is 17px, 71px from the card's left edge
