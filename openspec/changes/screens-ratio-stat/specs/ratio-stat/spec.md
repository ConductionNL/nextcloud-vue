# ratio-stat Delta: screens-ratio-stat

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-ratio-stat](../../)

## Purpose

Let a stat tile be a share of two counts and an average over a time span, from configured sources.

## ADDED Requirements

### Requirement: A stat can be a share of two counts

A stat `source` with `kind: "ratio"` SHALL show the numerator's value over the denominator's, times 100, where each
part MAY name its own `metric`, `field`, `filter` and `via`. With a denominator of 0 or none the tile SHALL have no value.

#### Scenario: Within the deadline

- **GIVEN** 46 answered in time of 50 answered
- **WHEN** the tile renders with `format.style: "percent"`
- **THEN** it reads 92%

### Requirement: A stat can average the time between two dates

A stat `source` with `kind: "elapsed"` and `from`, `to` (and `unit`: days, hours or minutes) SHALL show the average
of `to` minus `from` over the matching objects. Objects missing either date or with `to` before `from` SHALL be left
out; with none left the tile SHALL have no value.

#### Scenario: Average answer time

- **GIVEN** two answered tickets, one after 24 hours and one after 12 hours
- **WHEN** the unit is hours
- **THEN** the tile reads 18

### Requirement: A count the aggregation endpoint cannot express reads the list total

A count whose resolved filter holds a list of values, or with `via: "list"`, SHALL be read from the list endpoint's
total. Other metrics and plain counts SHALL keep using the aggregation endpoint.

#### Scenario: Open tickets

- **GIVEN** a count with `status: { "notIn": ["resolved", "closed"] }`
- **WHEN** the tile renders
- **THEN** it shows the list endpoint's total
