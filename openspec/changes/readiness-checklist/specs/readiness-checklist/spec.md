## ADDED Requirements

### Requirement: A readiness checklist says each item's state, why, and where to fix it

`CnReadinessChecklist` SHALL render each item with its state as a word (met, unmet, unknown), its explanation, and its label linked to `fixHref` when one is given. It SHALL read items from `source` through `fields` when a source is given, show `errorText` when that read fails, and re-read on window focus. Items with a `group` SHALL render under that group's heading. Unmet items marked `blocking` SHALL be named after `blockingText`.

#### Scenario: A first-run list

- **WHEN** the source answers `{ readiness: [{ id: "mail", title: "Mailbox", done: false, screen: "/settings/mail" }] }` with `fields: { label: "title", met: "done", fixHref: "screen" }`
- **THEN** the list shows "Still open", "Mailbox" linked to /settings/mail
