# l10n-merge-driver

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

End the catalogue conflict every merge of development produced.

## ADDED Requirements

### Requirement: Catalogues merge key by key

The l10n merge driver SHALL merge the ancestor, ours and theirs of a catalogue per key in each block
(`translations`, `plurals`): a key one side added SHALL be kept, a key one side removed dropped, a key only one side
changed SHALL take that change. Our keys SHALL keep our order, followed by the keys only theirs added. A key both sides
changed differently SHALL be written between conflict markers with exit code 1, and a side that does not parse SHALL
exit 1 without writing. The output SHALL be the repo's catalogue format (two-space JSON and a newline).

#### Scenario: Two branches add a string

- **GIVEN** one branch appends "Sent message" and the other "Move {item} up"
- **WHEN** they merge with the driver registered
- **THEN** the catalogue holds both, without a conflict
