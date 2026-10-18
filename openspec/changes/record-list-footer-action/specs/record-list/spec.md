# record-list Delta: record-list-footer-action

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-footer-action](../../)

## Purpose

End a record-list card with an action that can say why it is disabled, and let a visibleWhen condition match any of a list.

## ADDED Requirements

### Requirement: A record-list can end with an action that says why it is disabled

CnRecordListWidget SHALL draw `content.footerAction` (`{ label, icon?, ...action }`) as one secondary button under the list, also under the empty text, and SHALL run it through the page's dispatcher. While its `disabledWhen` visibleWhen condition holds, the button SHALL be disabled and `disabledReason` SHALL show under it, referenced by the button's `aria-describedby`. The condition SHALL be evaluated again when the page's record or the workspace changes. Label and reason SHALL go through the host translate.

#### Scenario: Beroep before the decision is sent

- **GIVEN** a Beroep record-list with `footerAction` "Beroep registreren", `disabledWhen: { field: "decisionSent", op: "neq", value: true }` and `disabledReason` "Kan zodra de beslissing is verzonden"
- **WHEN** it renders on an objection whose decision is not sent
- **THEN** the button is disabled and the reason shows under it

### Requirement: A visibleWhen condition can match any of a list

`compareVisibleWhen` SHALL accept `op: "anyOf"`, which holds when the value, or any entry of a list value, equals one of the listed values. An empty or missing value SHALL NOT match.

#### Scenario: A special category among others

- **GIVEN** `{ field: "dataCategories", op: "anyOf", value: ["health", "ethnicity"] }`
- **WHEN** the record's `dataCategories` is `["address", "health"]`
- **THEN** the condition holds
