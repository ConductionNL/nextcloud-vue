# currency-format Delta: screens-currency-format

## ADDED Requirements

### Requirement: A money value reads in its currency

A record-list template token `{path|currency}`, `{path|currency:CODE}` and
`{path|currency:field.path}`, the `currency` formatter and a cell with
`format.style: "currency"` SHALL write the amount as money in the currency named by
a literal code or by the row field `currencyField` / `field.path` (EUR when none
resolves to a three-letter code), with the number written in the Nextcloud user
language. An empty or non-numeric amount SHALL write nothing (the token empties its
template; a cell keeps its dash).

#### Scenario: A lead value in a template

- **GIVEN** `trailing: "{value|currency:EUR}"` and a row with value 12000, for a Dutch reader
- **WHEN** the row renders
- **THEN** it reads "€ 12.000,00"
- @e2e e2e/currency-format.e2e.js

#### Scenario: A currency read from the row

- **GIVEN** a column `format: { style: "currency", currencyField: "currency" }` and a row with currency USD
- **WHEN** the cell renders
- **THEN** it reads the amount in dollars
- @e2e e2e/currency-format.e2e.js
