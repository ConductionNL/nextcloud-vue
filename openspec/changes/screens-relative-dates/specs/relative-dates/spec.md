# relative-dates Delta: screens-relative-dates

## Purpose

A list says when something came in the way the boards draw it: "vandaag,
09.42", "gisteren", then a short date.

## ADDED Requirements

### Requirement: A relative date reads today, yesterday, then a short date

The library SHALL offer a relative date: a moment on the current calendar day
reads "today", on the previous day "yesterday" and on the next day "tomorrow";
any other day reads the board short date ("5 okt", with the year outside the
current year). With the time requested the time of day SHALL follow after a
comma ("vandaag, 09.42"). The words, the month names and the time separator
SHALL follow the Nextcloud user language. An empty or unparseable value SHALL
read as empty text and never throw.

#### Scenario: A Dutch reader, this morning

- **GIVEN** user language `nl` and a moment today at 09:42
- **WHEN** the relative date is formatted with the time
- **THEN** it reads "vandaag, 09.42"
- @e2e e2e/relative-dates.e2e.js

#### Scenario: Yesterday and an older day

- **GIVEN** user language `nl`, a moment yesterday at 23:12 and another four days ago
- **WHEN** both are formatted without the time
- **THEN** the first reads "gisteren" and the second the short date
- @e2e e2e/relative-dates.e2e.js

### Requirement: A date column and a template can read relatively

A column with `widget: "date"` and `widgetProps.relative: true` SHALL render the
relative date (with the time when `widgetProps.showTime` is true), with the full
date as its tooltip. The template tokens `{path|relative}` and
`{path|relativetime}` SHALL render it in record-list titles and meta lines. The
built-in `relativeDate` formatter SHALL render it, with the time when
`formatterOptions.time` is true. A date column without `relative` SHALL render as
before.

#### Scenario: A table cell

- **GIVEN** a date column with `widgetProps: { relative: true, showTime: true }`
- **WHEN** the row's moment is today at 09:42
- **THEN** the cell reads "vandaag, 09.42" and its tooltip holds the full date
- @e2e e2e/relative-dates.e2e.js

#### Scenario: A record-list meta line

- **GIVEN** a record list with `meta: "{app} · {submittedAt|relativetime}"`
- **WHEN** a row was submitted today at 09:42
- **THEN** the meta line reads "dossiq · vandaag, 09.42"
- @e2e e2e/relative-dates.e2e.js

#### Scenario: Without the key

- **GIVEN** a date column without `relative`
- **WHEN** it renders
- **THEN** it reads as it did before
- @e2e exclude the unchanged default, covered by `tests/components/CnCellRenderer.spec.js`
