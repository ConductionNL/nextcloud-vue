# mail-tab Delta

## ADDED Requirements

### Requirement: The empty draft can stay in the row beside the compose action

With `draft.blankButton: true` CnMailTab SHALL keep the template row's "Empty draft" button while the header carries
`compose`. Without it the row SHALL drop the button when the header carries `compose`, as before. In the board look
the template row's parts SHALL stand 14px 16px apart.

#### Scenario: DqZaakEmail

- **GIVEN** the case Email tab with `headerActions: ["link", "compose"]` and `draft.blankButton: true`
- **THEN** the header shows "Mail opstellen" and the row shows "Concept openen uit sjabloon" and "Leeg concept"
