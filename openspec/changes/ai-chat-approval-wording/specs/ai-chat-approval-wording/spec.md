# ai-chat-approval-wording

## ADDED Requirements

### Requirement: An app can word the approval card

The `ai-chat` widget SHALL read `approvalTitlePrefix`, `allowLabel` and `denyLabel` from its content, translate them
with the app's translate function, and use them for the approval card's title prefix and its two buttons.

#### Scenario: Board DqZaakAssistent

- **WHEN** dossiq sets `approvalTitlePrefix` "Proposal:", `allowLabel` "Run" and `denyLabel` "Don't do it", and the
  Dutch catalogue maps them to "Voorstel:", "Uitvoeren" and "Niet doen"
- **THEN** the card title reads "Voorstel:" followed by the approval's title, and the buttons read "Uitvoeren" and
  "Niet doen"

#### Scenario: No wording set

- **WHEN** the content sets none of the three keys
- **THEN** the card shows the tool's name with Allow and Decline, as before
