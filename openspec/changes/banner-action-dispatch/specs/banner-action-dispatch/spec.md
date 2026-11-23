# banner-action-dispatch Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [banner-action-dispatch](../../)

## Purpose

An attention card can act on the record it names.

## ADDED Requirements

### Requirement: A banner action can be a manifest action on the subject

An attention-card action with a `type` and no `route` or `href` SHALL be dispatched through the page's action dispatcher
with every `@subject.<path>` in it replaced by that path of the card's subject. Without a dispatcher it SHALL emit
`action` as before.

#### Scenario: Termijn opschorten

- **GIVEN** First today names case c-1 and has the action `{ type: "open-modal", target: "CaseLifecycleMenuDialog", props: { caseId: "@subject.id", act: "suspend" } }`
- **WHEN** the user presses it
- **THEN** the page opens CaseLifecycleMenuDialog with `caseId: "c-1"` and `act: "suspend"`
