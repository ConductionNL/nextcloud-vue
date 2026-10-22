# Proposal: board-facts-action-weight

## Why

The boards set a facts card's tinted action at 600: "Contact vastleggen" beside a contact (DqContact) and "Aan een
programma koppelen" on the programme card (DqZaakGerelateerd). CnFactsWidget draws it at 700. COMPDIFF r24:
`fontWeight 600>700` on both.

## What changes

In the board look `.cn-facts-widget__action` is set at 600. Measured on :8080 with the rule injected: 700 to 600.

## Scope

Board-only, `look-board-detail.css`. No schema change.
