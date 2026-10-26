## ADDED Requirements

### Requirement: An object's history can include the events of records beside it

An object audit trail card with `relatedSources` SHALL list, per source, the
objects of `register`/`schema` that match `filter` (with `@objectId` the card's
object, at most `limit`, default 5), read each one's audit trail, and show
those entries merged with the object's own, newest first. An entry from a
source named `as` SHALL take the label `actionLabels["<as>.<action>:<state>"]`,
else `actionLabels["<as>.<action>"]`, else the plain label. A related read that
fails SHALL leave only its own entries out.

#### Scenario: a consent recorded on a case
- GIVEN a case with one consent (`toestemming.caseId` the case) whose trail holds a `create` on 3 Oct, and a case trail with an `update` on 4 Oct
- WHEN the card declares `relatedSources: [{ as: "consent", register: "dossiq", schema: "toestemming", filter: { caseId: "@objectId" } }]` and `actionLabels: { "consent.create": "Consent recorded" }`
- THEN the rows read the case update, then "Consent recorded"

#### Scenario: a related read fails
- GIVEN the consent list read fails
- WHEN the card loads
- THEN the case's own entries show and the card does not say the history failed
