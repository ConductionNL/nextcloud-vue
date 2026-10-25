## ADDED Requirements

### Requirement: a data card can end with a footnote

CnObjectDataWidget MUST accept `footnote` and draw it, translated through the host, as a muted line under its fields; without it nothing is drawn. CnDetailWidgetHost MUST pass a `data` widget's `content.footnote`.

#### Scenario: DqZaakContact receipt confirmation
- GIVEN the receipt-confirmation data card with a footnote
- THEN the line "Ging de bevestiging buiten dossiq om, ..." stands under its fields
