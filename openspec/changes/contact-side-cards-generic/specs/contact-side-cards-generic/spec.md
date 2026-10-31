# contact-side-cards-generic

## ADDED Requirements

### Requirement: A field list draws its entries as label and value pairs

A field list with `variant: "pairs"` SHALL draw each entry as a label and a value in a description list. The label SHALL be `row.label`: a literal, or a list of parts where a string is a literal and `{ path, map? }` a value of the entry, the filled parts joined with ", ". The value SHALL be `row.title` followed by the filled `row.meta` parts, joined with ", ", and a link when `row.href` gives one. Edit and remove SHALL sit in a "..." menu named after the entry. An empty list SHALL show `emptyLabel` beside the empty text, and nothing when there is no `emptyLabel`.

#### Scenario: A resident's e-mail address
- **GIVEN** `row.label: ["Email", { "path": "kind", "map": { "private": "private" } }]`, `row.title: "value"`, `row.href: { "path": "value", "scheme": "mailto" }`
- **WHEN** the record holds `{ kind: "private", value: "s.devries@example.nl" }`
- **THEN** the card shows "Email, private" beside a mailto link "s.devries@example.nl"

#### Scenario: No social profiles yet
- **GIVEN** `emptyLabel: "Social"` and `emptyText: "None yet"`
- **WHEN** the list is empty
- **THEN** the card shows "Social" beside "None yet"

### Requirement: A field list keeps a plain field in step with its preferred entry

A field list with `mirror: { field, path, prefer? }` SHALL write `field` in the same PATCH as the list, with the `path` of the entry whose `prefer` flag is true, else of the first entry, else an empty string.

#### Scenario: The preferred e-mail address becomes the record's e-mail
- **GIVEN** `mirror: { "field": "email", "path": "value", "prefer": "primary" }`
- **WHEN** an address is added with `primary: true`
- **THEN** the one PATCH writes `emails` and `email` set to that address

### Requirement: Several list fields share one card and one add menu

The `field-groups` widget SHALL draw each of its `groups` (field-list contents) as a field list in the pairs look, in order, with one label column. It SHALL offer one Add: a menu with an item per group that can add, labelled with the group's `add.label`. With `add.placement: "title"` it SHALL report that menu on its `header` event for the card's title row; otherwise it SHALL draw it under the groups. Choosing an item SHALL open that group's form and close any other. `readOnly` SHALL remove every add, edit and remove; `afterSave` SHALL apply to every group that declares none.

#### Scenario: Contact channels with one Add in the title row
- **GIVEN** groups for `emails`, `phones` and `socialProfiles` and `add.placement: "title"`
- **THEN** the card's title row has one "Add" with the items "Email address", "Phone number" and "Social profile"
- **AND** choosing "Phone number" opens the phone form

### Requirement: A record's links to other records are listed, added and removed

The `object-links` widget SHALL read the objects of the link schema (`register`, `schema`) whose `from` field holds this record's id, and draw each as its type in words (`types[].label`) followed by the other record's name, read from the target schema its `toType` names, as a link to that target's `route`. Add SHALL open a dialog that searches every target schema (this record left out), offers the `types` and the extra `fields`, and writes the link with `defaults`, both sides' kinds, the type, its inverse and its group. A link to the same record with the same type SHALL be refused before any write. With `pair`, the inverse link from the other record SHALL be written on add and deleted on remove. A refusal SHALL show in the server's words. Without a record id or a link schema the widget SHALL send nothing.

#### Scenario: Secretary of a neighbourhood association
- **GIVEN** a link `{ toContact: "o-1", toType: "client", type: "secretaris" }` and the type label "Secretary of"
- **THEN** the card shows "Secretary of" followed by a link "Buurtvereniging Oost" to the client page

#### Scenario: Removing a link removes its inverse
- **GIVEN** `pair: true`
- **WHEN** the user removes the link
- **THEN** the link and the inverse link from the other record are deleted
