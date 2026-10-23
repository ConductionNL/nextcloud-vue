# widget-header-subtitle-counts Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-subtitle-counts](../../)

## Purpose

A list can say its counts as the line under its card title.

## ADDED Requirements

### Requirement: A list can say its counts under its card title

- CnRecordListWidget and CnObjectListWidget SHALL take `content.headerSubtitle`, fill `{total}` (the list's total) and
  `{count:<field>=<value>}` (the loaded rows whose field reads that value) after the host translate, and report it as
  the `subtitle` of their `header` event.
- CnObjectListWidget SHALL report the subtitle together with its Download action, and SHALL report no header when it has
  neither.
- CnChecklistWidget SHALL, with `content.summaryInHeader: true`, report its "done of total" line as the `subtitle` of its
  `header` event and not draw it above the items.

#### Scenario: DqZaakContact "Contactmomenten op deze zaak"

- **GIVEN** the contact moments list declaring `headerSubtitle: "{total} recorded"`, translated "{total} vastgelegd"
- **WHEN** it has loaded 4 contact moments
- **THEN** the card shows "4 vastgelegd" under its title

#### Scenario: DqTaak "Checklist"

- **GIVEN** a task checklist widget with `summaryInHeader: true` and 2 of 4 items ticked
- **THEN** the card shows "2 of 4 done" under its title and no summary line above the items
