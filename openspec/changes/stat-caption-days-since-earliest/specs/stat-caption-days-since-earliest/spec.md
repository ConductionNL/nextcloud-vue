# stat-caption-days-since-earliest Delta: stat-caption-days-since-earliest

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-caption-days-since-earliest](../../)

## Purpose

A stat tile's caption can say how long the longest wait is.

## ADDED Requirements

### Requirement: A stat caption can count the days since the earliest date

A stat tile with `captionSource.metric: "daysSinceEarliest"` and a date `field` SHALL read the record with the
earliest `field` date among those its caption filter matches, in one list request, and `{count}` in the caption
SHALL be the whole days from that date to today. No matching record, or a date of today, SHALL count 0, so the
caption reads `zeroText` or is left out. A failed read or a value that is not a date SHALL leave the caption out.

#### Scenario: Wacht op inwoner

- **GIVEN** a tile counting Pieter's cases waiting on the applicant, `caption: "longest: {count} days"` and a caption source `daysSinceEarliest` over `currentStatusEnteredAt`, and the case that waits longest entered its status 9 days ago
- **WHEN** the tile renders
- **THEN** the caption reads "longest: 9 days" (nl "langste: 9 dagen")
- @e2e exclude the request shape and the day count are covered by tests/components/CnStatWidgetCaptionDaysSince.spec.js against a fixed clock

#### Scenario: Nobody waits

- **GIVEN** the same tile and no matching case
- **WHEN** the tile renders
- **THEN** the caption reads `zeroText`, or is left out without one
- @e2e exclude covered by tests/components/CnStatWidgetCaptionDaysSince.spec.js
