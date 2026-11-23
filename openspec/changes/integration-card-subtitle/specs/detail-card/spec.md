## ADDED Requirements

### Requirement: An integration card shows its widget's subtitle

A detail card SHALL draw its `subtitle` under the title. The widget host SHALL hand an integration widget's `subtitle`,
translated, to its card.

#### Scenario: appointments on a case
- **GIVEN** the calendar widget with subtitle "From the calendar, linked to this case"
- **WHEN** the Taken tab opens for a Dutch reader
- **THEN** "Afspraken" reads "Uit de agenda, gekoppeld aan deze zaak" under it
