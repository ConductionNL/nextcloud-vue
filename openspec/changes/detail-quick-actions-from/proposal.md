# Proposal: detail-quick-actions-from

## Why

The quick actions above a case are the same three on every case. A youth-care case needs "Overleg plannen" where a
permit case needs "Document"; which actions a case needs most is the case type's configuration, not the page's.

## What changes

`quickActionsFrom` names a field path, read like a `visibleWhen` field (`@context.caseType.quickActions`). Its list of
`headerActions` ids picks the record's quick actions in that order. Only declared header actions are taken, so the data
never defines an action: an undeclared id or an action written out in the data is dropped. An empty or missing list
keeps `quickActions`. Schema 2.142.0.
