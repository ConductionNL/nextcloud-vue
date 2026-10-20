# leaf-cards-read-a-source Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [leaf-cards-read-a-source](../../)

## ADDED Requirements

### Requirement: A leaf card reads a source or an endpoint

CnNotesCard, CnAuditTrailCard and CnEventsCard SHALL read from `{apiBase}/flow-tasks/{id}/{leaf}` when given
`source: { kind: 'flow-task' }`, and from `endpoint` when given one, instead of the object URL. A failed read SHALL be
shown as failed, not as empty. Audit rows from a source SHALL read oldest first and SHALL mark an entry with
`authorized: false` as refused.

#### Scenario: dossiq

- **GIVEN** a task page whose notes card has `source: { kind: "flow-task", id: "@objectId" }`
- **WHEN** the page opens task `t-1`
- **THEN** the card lists `GET /apps/openregister/api/flow-tasks/t-1/notes` and adds through the same URL
