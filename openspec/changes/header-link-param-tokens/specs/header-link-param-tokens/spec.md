# header-link-param-tokens Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-link-param-tokens](../../)

## Purpose

A widget's header link can open the page its record names.

## ADDED Requirements

### Requirement: A header link's route params read the record

The `params` and `query` of a widget's `headerLink` SHALL resolve `@objectId` and `@object.<path>` against the record
of the page, in the tab strip and on a stacked card. A link with a route param that does not resolve SHALL NOT be drawn.

#### Scenario: View as flow

- **GIVEN** a case type whose `workflowDefinition` is `wf-9`
- **AND** a phase board with `headerLink: { label: "View as flow", route: "WorkflowDefinitionDetail", params: { id: "@object.workflowDefinition" } }`
- **THEN** the link opens WorkflowDefinitionDetail for `wf-9`
- **AND** on a case type without a workflow the link is not drawn
