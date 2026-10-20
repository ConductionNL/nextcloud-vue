# linked-integrations-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [linked-integrations-card](../../)

## Purpose

One card lists what other apps hold for a record, as the boards draw it, for every app.

## ADDED Requirements

### Requirement: One card lists the linked integrations of a record

A `linked` widget SHALL mount each mount-mode leaf named in `content.leaves`, in that order, with the record context and an
`onSummary(summary)` prop. A leaf reporting `count > 0` SHALL draw its rows, or "noun (count)" without rows. The leaves
reporting `count: 0` SHALL share one line "<nouns>: nothing linked" in the user's language, followed by their actions.
A leaf that is not registered or has not reported SHALL draw nothing.

#### Scenario: DqZaak "Gekoppeld"

- **GIVEN** a case with a linked dossier and no fees, contract or projects
- **THEN** the card shows the dossier row, then "Leges en betalingen, contract en projecten: niets gekoppeld"
- **AND** the links "Nieuw project" and "Openen in planninq"
