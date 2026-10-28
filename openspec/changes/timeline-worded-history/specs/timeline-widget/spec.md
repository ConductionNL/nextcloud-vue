# timeline-widget Delta: timeline-worded-history

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-worded-history](../../)

## Purpose

A timeline reads as a history in words, as the boards draw it.

## ADDED Requirements

### Requirement: A timeline says what an audit entry changed in words

The timeline widget SHALL word an audit entry by `changeLabels` (the first rule whose field the entry changed) or else
`actionLabels`, the label translated and filled with `{actor}`, `{state}`, `{changed.<key>}`, `{changed.<key>.old}` and
`{object.<path>}`, as the History card does. It SHALL leave out the entries `excludeActions` and `excludeActors` name, and
with a positive `limit` SHALL show only that many events after sorting.

#### Scenario: Board PqEvenement

- **GIVEN** an event whose trail holds its creation, a read, and an update of `capacity` from 60 to 80
- **WHEN** the timeline declares `excludeActions: ["read"]` and a change label for `capacity`
- **THEN** it reads "Places raised from 60 to 80" and "Event created", and no read

### Requirement: A related record's event can name the record

A `related` entry whose `label` holds `{path}` tokens SHALL be translated and filled from each row, without the title
line under it. A `related` entry with `when` SHALL keep only the rows its local condition holds for.

#### Scenario: The waiting list

- **GIVEN** two registrations, Joke van Dam on the waiting list and Sanne de Vries confirmed
- **WHEN** the related entry reads "{name} is on the waiting list" with `when` status waitlist
- **THEN** the timeline holds "Joke van Dam is on the waiting list" only
