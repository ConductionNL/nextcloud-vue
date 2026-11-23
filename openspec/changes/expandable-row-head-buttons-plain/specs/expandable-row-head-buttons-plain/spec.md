# expandable-row-head-buttons-plain Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [expandable-row-head-buttons-plain](../../)

## Purpose

An expandable row's sub-table head reads as a table head on a Nextcloud page.

## ADDED Requirements

### Requirement: The sub-table head buttons stay plain

CnExpandableRow's sort and filter buttons in the sub-table head SHALL draw without a background, border, radius or
margin of their own. Nextcloud's server rule on plain buttons SHALL NOT style them. An active or hovered filter button
SHALL keep its tint.

#### Scenario: Board PqPipelines

- GIVEN the Pipelinq pipelines list with the Sales pipeline opened
- WHEN the sub-table of stages renders
- THEN the "Fase" and "Kans" head buttons have no background and stand 4px from their filter buttons
