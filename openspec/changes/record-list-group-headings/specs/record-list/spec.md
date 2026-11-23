# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-group-headings](../../)

## Purpose

A record list can draw its rows in groups, as the boards do.

## ADDED Requirements

### Requirement: A record list can group its rows under headings

With `content.groupBy` CnRecordListWidget SHALL draw one list per value of that field, each named by an `<h3>` heading:
the field's `valueLabels` entry for the value, else the value, through the host translate. Groups SHALL follow
`groupOrder`, then the order the rows bring them; rows without a value SHALL come last, headed by `groupEmptyLabel` or
unheaded. Without `groupBy` the widget SHALL draw one list as before.

#### Scenario: DqZaakGerelateerd

- **GIVEN** relations with `kind` `subject`, `waitsOn` and `followUp`, labelled through `valueLabels`
- **THEN** the list draws "Onderwerp van deze zaak", "Wacht op" and "Gepland vervolg", each over its own rows

#### Scenario: No groupBy

- **GIVEN** a record list without `groupBy`
- **THEN** it draws one list without headings
