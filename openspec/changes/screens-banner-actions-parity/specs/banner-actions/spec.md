# banner-actions Delta: screens-banner-actions-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-banner-actions-parity](../../)

## Purpose

The attention card with the actions the DqMijnWerk board draws.

## ADDED Requirements

### Requirement: The board attention card shows the board's actions

CnBannerWidget's attention layout SHALL show at most `maxActions` actions (from
the prop, else `content.maxActions`) when that is a positive whole number.
Otherwise it SHALL show four under the board look and two without it. Actions
SHALL render in the order given, and the one marked `primary: true` (else the
first) SHALL take the primary style.

#### Scenario: Vandaag eerst

- **GIVEN** an attention card under the board look with four actions, the last marked primary
- **WHEN** it renders
- **THEN** all four show in order, the last as the primary button

#### Scenario: Without the board look

- **GIVEN** the same card without the board look and no `maxActions`
- **WHEN** it renders
- **THEN** it shows the first two, as before
