# detail-page Delta: detail-next-step-from-record

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-next-step-from-record](../../)

## Purpose

Let a record's type carry its own "what now" steps.

## ADDED Requirements

### Requirement: The next-step stages can come from the record

With `nextStep.stagesFrom` set, CnDetailPage SHALL read that field path like a `visibleWhen` field (the record and its `visibilityContext` records). When it holds a non-empty object of stages, or an object whose `stages` is one, the "what now" card SHALL use those stages for the record; otherwise it SHALL use `nextStep.stages`. Titles, labels and hints SHALL still go through the host translate.

#### Scenario: A case type's own steps

- **GIVEN** `nextStep: { stagesFrom: "@context.caseType.nextStep", stages: {…} }` and a case type whose `nextStep` names the stage `in_behandeling` with its own checklist
- **WHEN** a case of that type in that stage opens
- **THEN** the card shows the case type's title and checklist, and a case type without `nextStep` shows the declared stages
