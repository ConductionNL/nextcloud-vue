# index-toolbar-board-look Delta: screens-index-toolbar-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-toolbar-parity](../../)

## Purpose

Row 1 of the board toolbar and the search field as the DqZaken, PqTickets,
PqLeads and PtPortals boards draw them.

## ADDED Requirements

### Requirement: Filter and the view switch are one unit at the end of row 1

Under the board look `CnActionsBar` SHALL render the Filter button and the
view switch inside one element (`cn-actions-bar__view-controls`) that does
not wrap inside itself, after the quick-filter chips, the saved-view chips
and Save view. The free space of row 1 SHALL sit before Save view, or before
the unit when there is no Save view. When row 1 has no room for the unit, the
unit SHALL wrap as one to the start of the next line, with Save view staying
at the end of row 1. The unit SHALL render when either control renders.

#### Scenario: Six chips and Save view (DqZaken)

- **GIVEN** a board-look list with six quick-filter chips, Save view, Filter and a four-segment switch at 1440px
- **WHEN** the toolbar renders
- **THEN** Save view ends row 1 and Filter with the switch start the next line, next to each other

#### Scenario: Room on row 1 (PqLeads)

- **GIVEN** six chips, no Save view, Filter and the switch
- **WHEN** the toolbar renders with room on row 1
- **THEN** Filter and the switch end row 1

#### Scenario: Without the look

- **GIVEN** the same list without the board look
- **WHEN** the toolbar renders
- **THEN** there is no unit element and the switch keeps its sliding thumb

@e2e include Measure that Filter and the switch share a line against dossiq/DqZaken.

### Requirement: Save view is a ghost button in the user's language

Under the board look the Save view trigger SHALL be 34px high, padding 0
12px, radius 17px, no border, 13px weight 600 on
`--color-primary-element-light` with `--color-primary-element-light-text`, a
14px save icon 6px before the label, on one line. Its label and the other
strings of the board toolbar (Filter, Active:, Clear all, the filter count,
the saved-views menu and the quick-filter overflow) SHALL resolve against the
library catalogue, which SHALL carry them in Dutch ("Weergave opslaan",
"Filter", "Actief:", "Alles wissen").

#### Scenario: A Dutch session

- **GIVEN** a board-look list with saved views on, in a Dutch session
- **WHEN** the toolbar renders
- **THEN** the trigger reads "Weergave opslaan", has no border and sits on the light primary tint

### Requirement: The search placeholder comes from the manifest

An index page SHALL accept `config.searchPlaceholder`, a non-empty string,
and SHALL use it, run through the app's translate, as the placeholder and the
accessible name of its search field. Without the key the field SHALL keep the
library's "Search…".

#### Scenario: DqZaken

- **GIVEN** `searchPlaceholder: "Search by case, number or requester"` and a Dutch catalogue entry "Zoek op zaak, nummer of verzoeker"
- **WHEN** the list renders in Dutch
- **THEN** the search field reads "Zoek op zaak, nummer of verzoeker"

#### Scenario: No key

- **GIVEN** no `searchPlaceholder`
- **WHEN** the list renders
- **THEN** the field reads "Search…" in the user's language
