# board-attention-flag-button-height Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-attention-flag-button-height](../../)

## Purpose

The attention flag's buttons are as tall as the boards draw them.

## ADDED Requirements

### Requirement: The attention flag's buttons are 40px

In the board look a labelled button in CnAttentionFlagWidget SHALL be 40px tall.

#### Scenario: DqZaak

- **GIVEN** a case page in the board look
- **THEN** "Markeer voor aandacht" in the Status card is 40px tall

### Requirement: The attention flag's button sits under its hint

In the board look the attention flag in a sections card SHALL put its button the flag's column gap (6px) under the hint, with no extra margin under the hint.

#### Scenario: DqZaak Status card

- **GIVEN** a case page in the board look, nobody has flagged the case
- **THEN** "Markeer voor aandacht" starts 6px under the hint "Markeer de zaak met een reden..."
- **AND** the Status card is 311px tall, as the case boards draw it
