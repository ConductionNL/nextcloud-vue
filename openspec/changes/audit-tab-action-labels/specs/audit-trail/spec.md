# audit-trail Delta: audit-tab-action-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-tab-action-labels](../../)

## Purpose

The sidebar history tab says what happened in the same words as the History card.

## ADDED Requirements

### Requirement: The sidebar history tab words an action by its label

`CnAuditTrailTab` SHALL take `actionLabels` and SHALL show a row's action as its label, chosen and filled as the History
card does (by action and state, by action, by a `.*` wildcard; `{actor}`, `{toolId}`, `{state}`, `{changed.<key>}` and
`{object.<path>}` filled in). An action without a label SHALL show as recorded. The label SHALL pass through the app's label lookup (`cnTranslate`), as tab labels do, so it
shows in the user's language.

#### Scenario: An assistant action in the history tab

- **GIVEN** the sidebar `audit` widget with `actionLabels` `{ "mcp.*": "Assistant: {toolId}" }`
- **WHEN** the tab lists an entry with action `mcp.search` and tool `stackiq.module.search`
- **THEN** the row reads "Assistant: stackiq.module.search"

#### Scenario: An action without a label

- **GIVEN** the same labels
- **WHEN** the tab lists an `update` entry
- **THEN** the row reads "update"
