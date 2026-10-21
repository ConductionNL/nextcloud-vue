# pl4-index-live Delta: pl4-index-live

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-index-live](../../)

## Purpose

A shared list keeps up with what colleagues change.

## ADDED Requirements

### Requirement: An index page follows live changes

An index page with `live` SHALL subscribe to each named object type through the object store's live updates while it
is shown, SHALL read its list again half a second after the last change arrives, and SHALL unsubscribe when it
leaves. Without `live` it SHALL subscribe to nothing.

#### Scenario: A colleague moves a lead

- **GIVEN** the pipeline board with `live: ["lead", "ticket"]`
- **WHEN** a colleague moves a lead to Proposal
- **THEN** the board reads its cards again and the lead shows under Proposal
