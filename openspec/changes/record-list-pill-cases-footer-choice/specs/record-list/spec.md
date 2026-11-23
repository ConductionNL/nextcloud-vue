# record-list Delta: record-list-pill-cases-footer-choice

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A record-list's footer action can depend on the record

CnRecordListWidget SHALL accept `content.footerAction` as a list and SHALL draw the first entry whose `visibleWhen`
(a local condition over the page's record) holds; an entry without `visibleWhen` SHALL always hold, and with no
entry holding no action SHALL be drawn. An entry's `note` SHALL show as a muted line above its button, and
`wide: true` SHALL stretch the button across the card. `visibleWhen`, `note` and `wide` SHALL NOT be passed to the
dispatcher.

#### Scenario: The versions card of a published case type

- **GIVEN** a footerAction list of "Publish" (visible while `isDraft` is true) and "Make a new version" with a note
- **WHEN** the page shows a published version
- **THEN** the card ends with the note and "Make a new version" across the card

#### Scenario: The versions card of a draft

- **WHEN** the page shows a draft
- **THEN** the card ends with "Publish" and no note

### Requirement: A record-list row pill can read a state from several fields

CnRecordListWidget SHALL accept `content.pill.cases` (`[{ when, label, variant? }]`) and SHALL label each row by
the first case whose `when` holds on the row, else by the pill's own `label` and `variant`, else draw no pill.

#### Scenario: Version pills

- **GIVEN** cases Draft (isDraft true) and Locked (validUntil not empty), default Active
- **THEN** a draft reads Draft, a closed version Locked and the version in force Active
