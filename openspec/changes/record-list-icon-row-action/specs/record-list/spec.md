# record-list-icon-row-action Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-icon-row-action](../../)

## ADDED Requirements

### Requirement: A row's one action can be an icon button

CnRecordListWidget SHALL draw a `rowAction` that is a button, declares an `icon` and sets `iconOnly: true` as that icon alone in a 34px square, with the action's translated label as the button's `aria-label` and `title`. An `iconOnly` action without an icon SHALL keep its label as text.

#### Scenario: DqZaakBetrokkenen Toegang revoke button

- GIVEN a record list of a case's links whose `rowAction` is `{ label: "Revoke link", icon: "LinkVariantOff", iconOnly: true, variant: "outlined", endpoint, method: "DELETE" }`
- THEN a live link's row ends with a 34px square holding the icon only, named "Revoke link"
- AND clicking it calls the endpoint for that row and reads the list again

#### Scenario: no icon declared

- GIVEN the same action without an `icon`
- THEN the button shows the label "Revoke link" as text
