# macros-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [macros-per-record](../../)

## ADDED Requirements

### Requirement: A record can choose which macros it shows

A `macros` widget with `content.macrosFrom` SHALL show only the macro keys the list at that path (or the answer of
that endpoint) names, in the list's order; an endpoint that refuses SHALL offer none; unknown keys SHALL be skipped, and a record that names no list SHALL show no macros. Without `macrosFrom` it SHALL
show every macro the schema declares.

#### Scenario: Woo request and objection

- **GIVEN** the Woo case type lists `finish-woo-request` and `suspend-for-supplement`, and the objection case type lists none
- **THEN** a Woo case shows both macros and an objection shows none
