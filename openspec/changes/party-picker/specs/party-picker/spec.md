# party-picker Delta: party-picker

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [party-picker](../../)

## Purpose

One picker for a requester, client or contact, in every app.

## ADDED Requirements

### Requirement: One search field over several kinds of party

CnPartyPicker SHALL search every configured source once the reader typed `minLength` characters: an OpenRegister source with `_search` on its register and schema, a `contacts` source through Nextcloud's contacts menu. It SHALL list the rows as one list, each with its name (the source's `title` template), and a second line of the source's `label` and its `secondary` template, through the host translate; a failing source SHALL add nothing. Picking SHALL emit the row's id as `update:modelValue` and `{ source, id, label, secondary, row }` as `select`. A value not in the list SHALL show `selectedLabel`, else the name found by id in the OpenRegister sources.

#### Scenario: Aanvrager

- **GIVEN** the picker with a BRP persons source, a KvK companies source and a contacts source
- **WHEN** the reader types "Visser"
- **THEN** it lists "Henk Visser · Inwoner · Beukenlaan 3", "Visser Bouw B.V. · Organisatie · KvK 24157431" and the contact, and picking the company emits its id and the company source
