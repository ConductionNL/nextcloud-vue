## ADDED Requirements

### Requirement: an empty cell can read a label of its own

A table column with `emptyLabel` MUST show that label, translated, as plain text in a cell without a value, and MUST leave a cell with a value to its renderer.

#### Scenario: Besluiten tot
- GIVEN the Afdelingshoofd mandate without a ceiling, and the column `{ key: "terms.plafond", format: currency, emptyLabel: "Unlimited" }`
- THEN its cell reads "Onbeperkt"
- AND the Behandelaar row reads "€ 5.000"
