# phone-list-look

## ADDED Requirements

### Requirement: A widget can go without a card on one viewport

A dashboard widget definition MAY set `borderless`: `true` drops its card everywhere, `"narrow"` only under 640px and `"wide"` only on wider windows. A placement's own `borderless` MUST win over the definition's.

#### Scenario: the My work filter bar on a phone

- GIVEN My work's filter bar with `borderless: "narrow"` in the kpiRow
- WHEN the page renders at 375px
- THEN the bar sits on the page ground without a card
- AND at 1440px it keeps its card

### Requirement: Lens chips can be pills on a phone

A chips filter with `chipsOnPhone: "pills"` MUST draw its options under 640px as separate pills in one row that scrolls sideways, the chosen one filled.

#### Scenario: All, Tickets, Leads, Follow-ups at 375px

- GIVEN My work's lens chips with `chipsOnPhone: "pills"`
- WHEN the page renders at 375px
- THEN the four chips stand in one row, All filled, and the row scrolls sideways when it does not fit

### Requirement: A grouped record list can draw each group as a card

A record list with `groupBy` and `groupLook: "cards"` MUST draw each group's heading in uppercase above its own card. `groupTones` MUST tone the heading of the named group.

#### Scenario: Te laat

- GIVEN the phone list grouped on `dueGroup` with `groupTones: { late: "error" }`
- WHEN it renders
- THEN "TE LAAT" stands in the error ink above a card holding the late items, and "VANDAAG" in the soft ink above its own card
