# list-add-in-panel-heading Delta: object-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [list-add-in-panel-heading](../../)

## ADDED Requirements

### Requirement: A list can put its Add in the title row

With `content.addPlacement: "header"` CnObjectListWidget SHALL report its Add in its `header` event as `actions: [{ label, icon, add: true, variant: "secondary", run }]`, the icon `content.addIcon` or Plus, and SHALL draw no Add below the rows or in its empty state. Without create rights it SHALL report no Add.

#### Scenario: Contact moments on a ticket

- **GIVEN** the ticket's contact moments list with `addPlacement: "header"`, `addIcon: "Phone"` and `addLabel: "Log contact"`
- **WHEN** it renders
- **THEN** it reports "Contact vastleggen" with the phone icon for the title row and draws no button under the table

### Requirement: A tab panel heading carries what its widget reports

A bare CnDetailWidgetHost SHALL emit `panel-header` with what its widget reported for the title row. A single-widget tab with `showTitle: true` SHALL draw the reported subtitle under the widget title and the reported actions as buttons beside it, and SHALL draw that heading even when the title repeats the tab label. A tab without `showTitle` SHALL draw none of it.

#### Scenario: The Contact moments tab

- **GIVEN** the tab "Contactmomenten" with `showTitle: true` over the list above, whose `headerSubtitle` reads "{total} on this ticket, newest first"
- **WHEN** the list has two rows
- **THEN** the panel heading reads "Contactmomenten", "2 bij dit ticket, nieuwste eerst" and the outlined "Contact vastleggen" button
