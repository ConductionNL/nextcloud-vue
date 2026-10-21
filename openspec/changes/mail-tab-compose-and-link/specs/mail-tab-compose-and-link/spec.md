# mail-tab-compose-and-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [mail-tab-compose-and-link](../../)

## Purpose

A record's mail tab offers composing and linking mail as its header actions.

## ADDED Requirements

### Requirement: The mail tab can carry Compose mail and Link mail in its header

`CnMailTab` SHALL read `content.headerActions`, a list of `"compose"` and `"link"`, and draw those buttons beside its
heading. "Compose mail" SHALL open the empty draft through `content.draft`, or Nextcloud Mail's composer when there is
no draft endpoint, and SHALL be disabled while `closedWhen` holds. "Link mail" SHALL open the linked mail's picker,
which links the chosen message to the record through the existing email-link endpoint; it SHALL not be offered when
`linkedMail` is `false`. With a header action the template row SHALL drop its empty-draft button and the linked mail
SHALL drop its own buttons. Without `headerActions` the tab SHALL render as before. The labels are translated (en, nl).

#### Scenario: DqZaakEmail

- **GIVEN** a case's mail tab with `headerActions: ["link", "compose"]` and a draft endpoint
- **THEN** "Mail koppelen" and "Mail opstellen" stand beside the heading, and "Mail opstellen" opens the empty draft

#### Scenario: No draft endpoint

- **GIVEN** a mail tab with `headerActions: ["compose"]` and no `draft`
- **THEN** "Compose mail" opens Nextcloud Mail's composer in a new tab
