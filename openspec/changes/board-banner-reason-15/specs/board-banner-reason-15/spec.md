# board-banner-reason-15 Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-banner-reason-15](../../)

## Purpose

A board dashboard banner's reason line is set as the boards draw it.

## ADDED Requirements

### Requirement: A board dashboard banner's reason is 15px at normal leading

In the board look, the reason line of a `CnBannerWidget` on a dashboard page, other than a stacked banner, SHALL be 15px
at the font's normal line height.

#### Scenario: DqMijnWerk "Vandaag eerst"

- **GIVEN** the First today banner with a case number, type and deadline line
- **THEN** that line is 15px and 18px tall per line
