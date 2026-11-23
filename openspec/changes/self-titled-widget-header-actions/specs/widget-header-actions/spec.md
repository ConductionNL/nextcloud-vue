# widget-header-actions Delta

## ADDED Requirements

### Requirement: A self-titled widget draws its header actions beside its title

A widget that draws its own title (registry `ownsTitle`) and declares a `headerActions` prop SHALL receive the
widget definition's resolved `headerActions` and draw them in its own title row. The card that holds it SHALL NOT
draw them again.

#### Scenario: Board PqKlant Activiteit

- **WHEN** a client page shows the Activity timeline with the header actions Link email and Compose in Mail
- **THEN** both buttons stand in the title row of the card, to the right of "Activity"
- **AND** no row of buttons stands above the title

#### Scenario: A self-titled widget without the prop

- **WHEN** a self-titled widget that does not declare `headerActions` has manifest header actions
- **THEN** the card around it draws them in its header, as before
