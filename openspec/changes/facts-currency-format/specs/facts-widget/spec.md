# facts-widget Delta: facts-currency-format

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-currency-format](../../)

## Purpose

A facts entry can show an amount as money.

## ADDED Requirements

### Requirement: A facts entry can show a money amount

A facts entry or a `line` part with `format: "currency"` SHALL show its numeric value as money in the reader's
locale, with `decimals` fraction digits (2 by default). The currency SHALL be the entry's `currency`, else the code in
the record's `currencyField`, else the app's reporting currency, else EUR. A value that is not a number SHALL show as
written. An entry without the format SHALL render as before.

#### Scenario: An invoice total

- **GIVEN** an invoice whose `total` is `1234.5` and a facts entry `{ "path": "total", "label": "Total", "format": "currency" }`
- **WHEN** a Dutch reader opens the invoice
- **THEN** the entry reads "€ 1.234,50"

#### Scenario: The currency of the record

- **GIVEN** the entry declares `currencyField: "currency"` and the record's `currency` is `USD`
- **WHEN** the facts render
- **THEN** the amount is shown in US dollars
