## ADDED Requirements

### Requirement: A label or badge cell can word its value

A `label` or `badge` cell with `widgetProps.textTemplate` SHALL show the template, translated and filled from the row,
with `{value}` its own label; `{field|mailbox}` SHALL keep an address up to and with its @.

#### Scenario: Postvak
- GIVEN a badge with textTemplate "Looks like {value}" on value 2026-0079, Dutch
- THEN it reads "Lijkt op 2026-0079"
- AND a label "{value}, {recipient|mailbox}" on channel email reads "E-mail, gemeente@"
