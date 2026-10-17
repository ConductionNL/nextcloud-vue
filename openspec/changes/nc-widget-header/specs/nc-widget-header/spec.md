# nc-widget-header

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Draw one heading per Nextcloud widget card.

## ADDED Requirements

### Requirement: A Nextcloud widget draws no second heading

CnNcWidgetWidget SHALL NOT render its own header when the hosting CnWidgetWrapper draws a title row (a visible,
non-empty title), nor when `content.showHeader` is `false`. Otherwise it SHALL render its header as before.

#### Scenario: Inside a titled card

- **GIVEN** an `nc-widget` for "activity" in a card titled "Recente activiteit"
- **WHEN** the card renders
- **THEN** the only heading is "Recente activiteit"
