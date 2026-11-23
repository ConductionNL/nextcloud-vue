# record-list-avatar Delta: screens-record-list-avatar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-record-list-avatar](../../)

## Purpose

Let a record list lead each row with the initials of a name, and carry that name on its second line, by configuration.

## ADDED Requirements

### Requirement: A record-list row can carry an avatar

With `content.avatar` (a name template, or `{ text }`) a `rows` record list SHALL draw before each row's title a 36px
circle holding the initials of the filled name: the first letters of its first and last word, upper-cased. A row whose
name is empty SHALL draw no circle. The circle SHALL be hidden from assistive technology. Without `avatar` the list
SHALL render as before.

#### Scenario: Customer initials

- **GIVEN** `avatar: "{client.name}"`, `extend: ["client"]` and `meta: "{client.name} · {channel}"`
- **WHEN** a row's client is "Sanne de Vries" and its channel "Mijn Zuiddrecht"
- **THEN** the row shows a circle "SV" before the title and "Sanne de Vries · Mijn Zuiddrecht" under it

#### Scenario: No customer

- **WHEN** a row has no client
- **THEN** it has no circle and no meta line
