# facts-widget Delta

## ADDED Requirements

### Requirement: A facts row can be one line across both columns

A facts row with `inline: true` SHALL span both grid columns as one line: the label, the value and the value's buttons,
side by side. The other rows SHALL keep the label and value columns.

#### Scenario: DqContact Identiteit

- **GIVEN** Sanne de Vries' masked BSN with "Tonen"
- **THEN** "BSN", "*****4001" and "Tonen" share one line, above the "Geheimhouding" and "Bron" rows
