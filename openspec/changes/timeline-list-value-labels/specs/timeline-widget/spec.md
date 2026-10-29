# timeline-widget Delta: timeline-list-value-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-list-value-labels](../../)

## Purpose

A status history on the object reads in words, not as stored values.

## ADDED Requirements

### Requirement: A list entry's value reads in words

A `lists` entry SHALL accept `valueLabels` (`{ <value>: <label> }`). An entry whose `labelField` value is a key of
`valueLabels` SHALL be labelled by that label. Any other entry SHALL keep its stored value as its label.

#### Scenario: Board PqAfspraak

- **GIVEN** a booking whose `statusHistory` holds `{ status: "confirmed", changedAt }`
- **WHEN** the timeline lists it with `labelField: "status"` and `valueLabels: { "confirmed": "Status: Confirmed" }`
- **THEN** the event reads "Status: Confirmed" (in Dutch "Status: Bevestigd")

#### Scenario: A value without words

- **GIVEN** the same list with an entry whose status is "no-show" and no `valueLabels` key for it
- **THEN** the event reads "no-show"
