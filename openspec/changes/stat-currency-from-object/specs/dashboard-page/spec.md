# dashboard-page Delta: stat-currency-from-object

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-currency-from-object](../../)

## Purpose

Show a KPI's money value in the currency it belongs to, in the user's locale.

## ADDED Requirements

### Requirement: A stats-block entry formats its value

A stats-block entry SHALL accept `format`, either a style name (`number`,
`currency`, `percent`, `decimal`, `duration-hours`) or an object `{ style,
currency, currencyField, decimals, prefix, suffix }`, and SHALL show its
resolved value formatted that way. A `currency` or `currencyField` on the entry
itself SHALL fill the same keys and imply `style: "currency"`. An entry with
none of the three SHALL show the plain localized count, as before. The
single-source stats block SHALL accept the same shape as its `format` prop.
Numbers SHALL be formatted with Intl in the user's Nextcloud locale, else the
browser's.

#### Scenario: "format": "currency" is honoured

- **GIVEN** a stats-block entry with `metric: "sum"`, `format: "currency"` and an app config whose `currency` is `CHF`
- **WHEN** the entry resolves to 1250
- **THEN** it shows 1250 formatted as CHF, not the bare number

#### Scenario: An entry without a format is unchanged

- **GIVEN** a stats-block entry with `metric: "count"` and no format
- **WHEN** it resolves to 1250
- **THEN** it shows the localized count

#### Scenario: The user's locale

- **GIVEN** a user whose Nextcloud locale is `nl-NL`
- **WHEN** a currency entry resolves to 1250 USD
- **THEN** it is formatted with the `nl-NL` conventions

### Requirement: A money value is shown in the currency the entry names

The currency of a money value SHALL be taken, in order, from the detail page
object's `currencyField` (dot-path allowed), from `currency` (a code, or a
`@config.<key>` or `@object.<field>` token), from the app's reporting currency
(`currency` in the page's app config), else `EUR`. A step whose value is not a
three-letter code SHALL be skipped. The stat widget's `content.format` SHALL
follow the same order.

#### Scenario: A contract in dollars

- **GIVEN** a detail page for a sales contract whose `currency` is `USD`, an app reporting currency of `EUR`, and a stats-block entry with `currencyField: "currency"`
- **WHEN** the entry resolves to 1250
- **THEN** it shows 1250 in USD

#### Scenario: The object has no currency

- **GIVEN** the same entry on an object whose `currency` is empty and an app reporting currency of `GBP`
- **WHEN** the entry resolves
- **THEN** it shows the amount in GBP

#### Scenario: A stat widget reads the object's currency

- **GIVEN** a stat widget with `format: { style: "currency", currencyField: "currency" }` on a record whose `currency` is `USD`
- **WHEN** it renders
- **THEN** the value is shown in USD
