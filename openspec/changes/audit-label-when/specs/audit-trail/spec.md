# audit-trail Delta: audit-label-when

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-label-when](../../)

## Purpose

A history line can say different things for different records.

## ADDED Requirements

### Requirement: An action label can depend on the record

An `actionLabels` value that is a list of `{ when?, text }` SHALL give the text of the first entry whose local
visibleWhen condition holds for the record, an entry without `when` always holding. When none holds the entry SHALL be
worded as without a label.

#### Scenario: An event without a campaign

- **GIVEN** the labels "Event created in campaign {object.campaign}" when `campaign` is not empty, else "Event created"
- **WHEN** the history words the creation of an event without a campaign
- **THEN** it reads "Event created"
