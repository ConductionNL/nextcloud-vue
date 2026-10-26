# index-page Delta

## ADDED Requirements

### Requirement: A count column can show its zero label as text

A column whose `aggregate` sets `zeroAs: "text"` SHALL show its `zeroLabel` for a zero count as muted text, not
through the column's widget; other counts SHALL keep the widget.

#### Scenario: DqOrganisaties Lopende zaken

- **GIVEN** a badge column counting open cases with `zeroLabel: "None"` and `zeroAs: "text"`
- **WHEN** one organisation has 1 open case and another none
- **THEN** the first row shows a "1" pill and the second the muted text "None"
