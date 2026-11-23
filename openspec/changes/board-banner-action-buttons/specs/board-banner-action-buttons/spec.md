# board-banner-action-buttons Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-banner-action-buttons](../../)

## Purpose

A banner's actions look like the board's buttons.

## ADDED Requirements

### Requirement: A board banner's actions are the board's buttons

In the board look a CnBannerWidget action SHALL be at least 40px tall with 14px text, and its primary action SHALL draw
no border.

#### Scenario: PtDashboard

- **GIVEN** the attention banner on portaliq's dashboard in the board look
- **THEN** "Verzoek beoordelen" is 40px tall, 14px, with no edge
