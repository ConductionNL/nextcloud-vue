# row-mark-list Delta: row-mark-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [row-mark-list](../../)

## Purpose

Every row of a list gets one of a few marks, with details per mark, saved in one request, from configuration.

## ADDED Requirements

### Requirement: A list of rows is marked and saved in one request

The `row-mark-list` widget SHALL read its rows from `content.load` at `content.rowsPath`, sending the value of every
control (`content.controls`, from the page query or the answer) as a query parameter. A row without a mark SHALL take
`content.defaultState`. A tap on a mark, or the mark's translated `key` while the row has focus, SHALL give the row
that mark; arrow keys SHALL move between rows. A detail field SHALL show only for the marks it names, take its
`default` when the row takes such a mark, and be cleared when the row leaves them. Before saving, a row missing a
required detail SHALL be named and nothing SHALL be sent. The save SHALL send one request with the configured body
values and, under `rowsKey`, every row's key, mark and the non-empty details its mark shows. When the answer's
`editablePath` is not true the marks and the save SHALL be disabled.

#### Scenario: A teacher takes the register

- **GIVEN** a group of two pupils, one without a mark and one late by ten minutes
- **WHEN** the teacher marks the first absent with permission, picks "Ill" and saves
- **THEN** one request carries both rows: the first with its reason, the second as stored

#### Scenario: A late mark without minutes is not saved

- **GIVEN** a pupil marked late whose minutes are cleared
- **WHEN** the teacher saves
- **THEN** no request is sent and the pupil is named in the message

#### Scenario: Keys follow the language

- **GIVEN** a mark whose key is "E" and a language that translates it to "X"
- **WHEN** the teacher presses X on the row
- **THEN** the row takes that mark and the hint names the X key
