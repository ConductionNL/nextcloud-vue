# board-detail-card-title-icon Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-card-title-icon](../../)

## Purpose

A detail page's cards are titled as the boards title them.

## ADDED Requirements

### Requirement: A board detail card is titled without an icon

In the board look a card on a detail page SHALL draw its title without the widget's icon, so the title starts on the
card's inset. Outside the board look the icon SHALL stay.

#### Scenario: DqContact

- **GIVEN** a contact's detail page in the board look whose "Contact" widget has an icon
- **THEN** the "Contact" title starts 23px from the card's edge and no icon is drawn before it

#### Scenario: DqTaak "Notities" (CnDetailCard)

- **GIVEN** a task's detail page in the board look with a notes card drawn by `CnDetailCard` with an icon
- **THEN** the "Notities" title starts 23px from the card's edge and no icon is drawn before it

#### Scenario: a CnDetailCard in the side column (PtInzending "Bewijslog")

- **GIVEN** a submission's detail page in the board look whose side column holds the audit trail card with its history icon
- **THEN** the "Bewijslog" title starts 23px from the card's edge and no icon is drawn before it
