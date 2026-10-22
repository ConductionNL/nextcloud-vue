# conversation-source Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [conversation-board-bubble](../../)

## ADDED Requirements

### Requirement: A message names its author per side, its direction and a note

A `conversation` widget SHALL read a message's author from `usAuthorField` or `themAuthorField` for its side, falling back
to `senderField`; a field written `@object.<path>` SHALL be read from the bound record. With `usAuthorFormat` or
`themAuthorFormat` set to `user` the value SHALL be shown by the user's display name. With `showDirection` each message
SHALL say "Incoming" or "Outgoing" before its time. A `noteField` value SHALL be a muted line under the text, and
`subtitle` a line under the title.

#### Scenario: DqZaakContact

- **GIVEN** an incoming phone note on a case requested by Sanne de Vries and an outgoing message logged by `pieter`
- **WHEN** the conversation shows
- **THEN** the first reads "Sanne de Vries · Telefoon · Inkomend · 3 okt, 14:10" and the second names Pieter Jansen
