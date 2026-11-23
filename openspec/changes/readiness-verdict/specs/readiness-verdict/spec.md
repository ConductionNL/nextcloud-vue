# readiness-verdict Delta: readiness-verdict

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [readiness-verdict](../../)

## Purpose

A list of what a step needs says how far along it is and lets the user take that step once everything is there.

## ADDED Requirements

### Requirement: The list gives a count, a verdict and a confirm

`CnReadinessChecklist` SHALL fill `summary` with `{met}`, `{open}` and `{total}` and draw it above the list. It SHALL draw
`verdict.met` when there are items and all are met, else `verdict.unmet`, in the `status` role, as a word and not as a colour
alone. With `confirmLabel` it SHALL draw a button that stays disabled until every item is met and emits `confirm` when
pressed. An item whose state is unknown SHALL count as open. `note` SHALL draw as a line under the list.

#### Scenario: Board DqZaakDocumenten, not yet complete

- **GIVEN** 5 items of which 2 are met, `summary` "{met} van {total} aanwezig, {open} ontbreken", and `verdict`
  `{ met: "Ontvankelijk", unmet: "Nog niet ontvankelijk" }`
- **THEN** the list reads "2 van 5 aanwezig, 3 ontbreken" and "Nog niet ontvankelijk"
- **AND** the confirm is disabled

#### Scenario: Board DqZaakDocumenten, complete

- **GIVEN** every item is met
- **THEN** the verdict reads "Ontvankelijk"
- **WHEN** the user presses the confirm
- **THEN** the component emits `confirm`

#### Scenario: No items

- **GIVEN** no items
- **THEN** the verdict reads the `unmet` text and the confirm is disabled
