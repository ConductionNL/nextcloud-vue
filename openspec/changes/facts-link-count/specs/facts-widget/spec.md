# facts-widget Delta

## ADDED Requirements

### Requirement: A facts link can name a count

A facts `link` with `countFrom` SHALL put the total of that list in its label's `{count}`, and SHALL show `fallbackLabel` while the count cannot be read.

#### Scenario: PqContactmoment Klant

- **THEN** the link reads "Klantpagina, 4 eerdere contacten"

### Requirement: A fact can read as a long date with its time

A fact with `format: longdatetime` SHALL write the month out, with the year and the time.

#### Scenario: PqContactmoment Wanneer

- **THEN** it reads "7 oktober 2026, 09:12"
