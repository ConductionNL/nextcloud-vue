# audit-trail Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-trail-action-labels](../../)

## ADDED Requirements

### Requirement: A trail can say what happened in words

An audit trail with `actionLabels` SHALL show an entry's action as the label for `<action>:<stateAfter>`, else for
`<action>`, with `{actor}` replaced by the actor's name and `{state}` by the state it led to. When that label names the
actor, the line under it SHALL NOT repeat the actor. An action without a label SHALL show as before. The widget SHALL
pass each label through the app's translate.

#### Scenario: DqTaak

- **GIVEN** `actionLabels: { "claim": "Task picked up by {actor}" }` and a Dutch translation
- **WHEN** Pieter Jansen picked the task up
- **THEN** the history reads "Taak opgepakt door Pieter Jansen"
