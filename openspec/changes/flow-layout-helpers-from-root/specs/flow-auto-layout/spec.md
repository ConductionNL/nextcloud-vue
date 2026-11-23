# flow-auto-layout Delta: flow-layout-helpers-from-root

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-layout-helpers-from-root](../../)

## Purpose

The flow layout helpers are part of the package's public surface.
Answers stackiq `architecture-assistant-drafted-views` (row
`arch-ai-diagram`).

## ADDED Requirements

### Requirement: The flow layout helpers are exported from the package root

`layoutFlowNodes`, `needsFullLayout`, `placeLooseNodes`, `readNodePoint`,
`FLOW_LAYOUT_COLUMN_WIDTH`, `FLOW_LAYOUT_ROW_HEIGHT`, `FLOW_LAYOUT_MARGIN`
and `FLOW_LAYOUT_TOP` SHALL be exported from `@conduction/nextcloud-vue`'s
root entry and from its composables barrel.

#### Scenario: stackiq lays out an assistant's draft

- GIVEN stackiq's architecture view editor imports `layoutFlowNodes` and `needsFullLayout` from `@conduction/nextcloud-vue`
- WHEN an assistant-drafted view without positions opens
- THEN the nodes are placed in layers, and no import names a source path

#### Scenario: A refactor that drops a helper fails here

- GIVEN a change that stops re-exporting `layoutFlowNodes`
- WHEN the test suite runs
- THEN the packaging test fails naming the missing export
