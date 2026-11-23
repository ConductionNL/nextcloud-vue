# pl4-cell-rules Delta: pl4-cell-rules

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-cell-rules](../../)

## Purpose

Row conditions an app wrote in its own cells become options of the library cells and row rules.

## ADDED Requirements

### Requirement: A due date is due only while a row condition holds

The `date` cell with `widgetProps.due.activeWhen` (`{ field, equals | in | lt | gt }`) SHALL read the date as a due
text only while the condition holds on the row. Otherwise it SHALL read the short date in no colour, and SHALL NOT mark
it overdue or due soon. An empty date SHALL still read the configured empty text.

#### Scenario: A won lead's close date

- **GIVEN** a column `{ widget: "date", widgetProps: { due: { soonWithin: 7, activeWhen: { field: "status", equals: "open" } } } }`
- **WHEN** the close date lies three days back and the row's `status` is `won`
- **THEN** the cell reads the short date, not "3 days overdue", and not in the error colour

### Requirement: A row condition can compare a number

A row condition (row indicators, `flagWhen`, `titleWhen`, `due.activeWhen`) SHALL hold for `lt` while the field is a
number below the bound and for `gt` while it is above it; with both, while it lies between them. An empty value or one
that is not a number SHALL never hold.

#### Scenario: A low win chance

- **GIVEN** `flagWhen: { field: "winProbability", lt: 30, text: "Low" }`
- **WHEN** the row's `winProbability` is 12
- **THEN** the cell shows the chip "Low"; at 30 or with no value it does not

### Requirement: A row-class rule can require several conditions

A row-class rule's `when` MAY be a list of conditions. The rule SHALL add its class only when every condition holds;
an empty list SHALL never hold.

#### Scenario: An open lead past its date

- **GIVEN** the rule `{ when: [{ field: "expectedCloseDate", op: "lt", value: "@today" }, { field: "status", value: "open" }], class: "cn-row--overdue" }`
- **WHEN** an open lead's close date lies before today
- **THEN** its row carries `cn-row--overdue`, and a won lead with the same date does not

### Requirement: A token can take a config value

A filter token MAY hold `{@config.<key>}` (`@today-{@config.lead_stale_threshold_days}d`); it SHALL resolve with the
app config's value filled in, and SHALL stay as written while the config does not hold the key. An index page's
`footerNote` SHALL name `@config.<key>` values after translation, as its quick-filter labels do.

#### Scenario: An admin moves the stale threshold

- **GIVEN** the Leads chip "Out of date" filters `@self[updated][lt]` on `@today-{@config.lead_stale_threshold_days}d`
- **WHEN** the admin setting reads 21
- **THEN** the chip lists the open leads not touched for 21 days, and the footer note says 21 days

