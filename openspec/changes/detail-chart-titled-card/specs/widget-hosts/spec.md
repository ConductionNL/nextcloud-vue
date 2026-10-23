# widget-hosts Delta: detail-chart-titled-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-chart-titled-card](../../)

## Purpose

A chart on a detail page carries the card and title every body widget carries.

## ADDED Requirements

### Requirement: A detail chart sits in a titled card

CnDetailWidgetHost SHALL draw a `chart` widget that has a `title`, on a card surface, inside CnWidgetWrapper with that
title and the widget's subtitle, and SHALL pass the chart the record context. With `chrome: "bare"` it SHALL render the
chart without the wrapper.

#### Scenario: The enforcement matrix

- **GIVEN** a detail page widget `{ type: "chart", title: "Advice …", subtitle: "The chosen cell is outlined" }`
- **WHEN** it renders in the body grid
- **THEN** the matrix sits in a card titled "Advice …" with the subtitle under the title
