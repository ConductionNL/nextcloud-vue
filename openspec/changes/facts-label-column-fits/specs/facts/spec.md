## ADDED Requirements

### Requirement: The facts label column is as wide as its labels

The facts widget's label column SHALL be as wide as its widest label, whatever width the server stylesheet gives `dt`.

#### Scenario: priority card
- **GIVEN** the facts rows "Afgeleid" and "Overschreven"
- **WHEN** the card renders under Nextcloud's core stylesheet
- **THEN** the values SHALL start 16px after "Overschreven"
