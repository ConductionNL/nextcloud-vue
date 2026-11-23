## ADDED Requirements

### Requirement: The applied view names itself, not its filters

While a saved view is applied, the Active line SHALL NOT show a chip for a filter value the view sets itself.

#### Scenario: Wacht op inwoner
- **GIVEN** the view "Wacht op inwoner" (waitingOnApplicant: true) is applied
- **THEN** the Active line SHALL show no "Wacht op inwoner: true" chip
