# chart-compact-number Delta

## ADDED Requirements

### Requirement: A chart value can be written short

A chart's `valueFormat` MAY be `compact`. Each value SHALL then be written in the locale's compact notation without a
currency sign, with no fraction digits unless the object form names `decimals`.

#### Scenario: Board PqVerkoopoverzicht pipeline per stage

- **WHEN** a bar list declares `valueFormat: "compact"` and a stage holds 38000
- **THEN** the value at the end of that bar reads "38K", with no currency sign
