# phone-pages

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Keep the board pages usable at phone width.

## ADDED Requirements

### Requirement: The library pages hold at phone width

Below 600px a board dialog SHALL render as a bottom sheet: full viewport width, anchored to the bottom, its height
its content's up to the screen less the header, a 16px top radius, and its footer buttons sharing one row at least 44px
tall. Below 768px the board detail header's first row SHALL take its own height. Below 640px a board dashboard
widget's Actions menu SHALL show its icon only in a 44px target and keep its name for assistive tech.

#### Scenario: A dialog on a phone

- **GIVEN** a board CnDialog with two footer buttons at 390x844
- **WHEN** it opens
- **THEN** it spans x 0 to 390, ends at the bottom edge, and the buttons are equally wide
