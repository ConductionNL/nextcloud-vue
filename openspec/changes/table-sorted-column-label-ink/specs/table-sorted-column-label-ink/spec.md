# table-sorted-column-label-ink Delta

## ADDED Requirements

### Requirement: The sorted column's label is at full text colour

A CnDataTable header whose `aria-sort` is `ascending` or `descending` SHALL draw its label in `--color-main-text`;
other headers SHALL keep the header's secondary text colour.

#### Scenario: a list sorted by deadline

- **GIVEN** a case list sorted by "Termijn"
- **THEN** the "Termijn" header label is drawn in the main text colour
- **AND** the "Status" header label stays in the secondary text colour
