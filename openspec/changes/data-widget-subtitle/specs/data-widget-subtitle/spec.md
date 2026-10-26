## ADDED Requirements

### Requirement: a data card shows its subtitle

CnObjectDataWidget MUST accept `subtitle` and show it under its title, and CnDetailWidgetHost MUST pass a `data` widget's subtitle to it.

#### Scenario: DqZaakContact receipt confirmation
- GIVEN the receipt-confirmation data card with subtitle "Awb 4:3a: de verzoeker hoort dat het verzoek binnen is"
- THEN that line stands under the card title
