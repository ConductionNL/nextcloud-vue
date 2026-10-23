## ADDED Requirements

### Requirement: a widget table's first column is plain text in the board look

In the board look, a framed CnWidgetObjectTable's title column MUST NOT take the list page's 600-weight underlined link style. A borderless one, the dashboard's compact case list, keeps it.

#### Scenario: DqDoorlooptijd
- GIVEN the lead-time tables on the dashboard in the board look
- THEN their first column is plain text

#### Scenario: DqDashboard
- GIVEN a borderless case list tile on the dashboard in the board look
- THEN its title column stays the underlined link, the case number under it
