# decision-list-widget Delta: decision-list-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [decision-list-widget](../../)

## Purpose

One worklist of per-row decisions, in every app that asks people to sign things off.

## ADDED Requirements

### Requirement: A worklist of per-row decisions

The `decision-list` built-in widget SHALL read its rows from `content.source` and list each with its `title` and `meta` templates. Each row SHALL offer the configured `answers`, a reason unless `reason` is false, and the fields the chosen answer declares. A row SHALL be sendable only with an answer, a needed reason and its required fields. Sending SHALL post the answer, the reason and those fields to the row's `submit.request.url`, and SHALL take the row off the list when it lands. A refusal SHALL stay on its row in the server's words. A failed read SHALL show an error with a retry, and an empty answer SHALL show `emptyText`.

#### Scenario: Retaining an archival entry

- **GIVEN** the widget on DqMijnWerk with two pending destruction list entries
- **WHEN** the reviewer answers Retain on the first, writes why and picks 15 January 2031
- **THEN** it posts `{ answer: "retain", reason, newArchiefactiedatum: "2031-01-15" }` to that entry's decision url and the entry leaves the list

#### Scenario: Openregister cannot be read

- **GIVEN** the pending reviews request fails
- **THEN** the widget shows an error with a retry, not "no archival decisions"
