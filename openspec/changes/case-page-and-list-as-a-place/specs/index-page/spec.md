# index-page Delta: case-page-and-list-as-a-place

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [case-page-and-list-as-a-place](../../)

## Purpose

The list and the record become one place a person works in, and the
product remembers how each person likes it. Round 4 discovery cluster 58,
seventeen candidates, owner nextcloud-vue. Consumed by dossiq on
`#Cases`, `#Queue` and `#CaseDetail`.

## ADDED Requirements

### Requirement: The list and one record sit side by side

An index page SHALL accept `splitView` with `enabled` and a
`breakpoint`. On a page that declares it, opening a row SHALL render the
record beside the list at `/<page>/split/:id`, and the list SHALL keep
its scroll position, its selection and its loaded page. Below the
breakpoint the same address SHALL render the full detail page. The pane
SHALL mount the same detail component the full route mounts. A record
saved in the pane SHALL replace its row in the list in place, without
refetching the list. A page that does not declare `splitView` SHALL
render as it does today.

#### Scenario: Triage without losing your place

- **GIVEN** a handler scrolled to row 180 of a 400-case list on a page declaring `splitView`
- **WHEN** they open a case and close it again
- **THEN** the list is still at row 180 with the same selection

#### Scenario: The same link opens on a phone

- **GIVEN** a split-view address sent from a laptop
- **WHEN** it is opened on a screen narrower than the breakpoint
- **THEN** the full detail page renders at that same address

#### Scenario: An edit updates the row without a refetch

- **GIVEN** a case open in the split pane
- **WHEN** the handler changes its status and saves
- **THEN** that row updates in the list, the scroll position is unchanged, and no new page request is made

### Requirement: A record steps to the next one in the list it came from

A detail page opened from a list SHALL offer next and previous, stepping
through that list in its current filter and sort. The list context SHALL
live in the route so a reload keeps it. A detail page opened without list
context SHALL offer neither, rather than inferring an order. The first
and the last record SHALL say so rather than wrapping.

#### Scenario: A handler works a queue of forty

- **GIVEN** a handler who opened the fourth case of a filtered list
- **WHEN** they choose next
- **THEN** the fifth case of that same filtered list opens

#### Scenario: A reload keeps the queue

- **GIVEN** a handler on a case reached from a list
- **WHEN** they reload the page
- **THEN** next and previous still step through the same list

#### Scenario: A bare link offers no guess

- **GIVEN** a link to a case with no list context
- **WHEN** it is opened
- **THEN** next and previous are absent

### Requirement: The active tab is part of the address

A detail page with tabs SHALL put the active tab in the address, and
opening that address SHALL open that tab. An address naming a tab that
does not exist, or that the user may not see, SHALL fall back to the
first tab they may see and SHALL say so once. The tabless address SHALL
redirect to the canonical one. Browser back and forward SHALL walk the
tabs the user visited.

#### Scenario: A colleague is pointed at the evidence

- **GIVEN** a case with a Documents tab
- **WHEN** a handler copies the address while on that tab and sends it
- **THEN** the colleague opens on the Documents tab

#### Scenario: A tab that is not theirs

- **GIVEN** an address naming a tab the user may not see
- **WHEN** it is opened
- **THEN** the first tab they may see renders, with one message saying why

### Requirement: A reference previews in place

A reference to another record SHALL show a summary of that record on
focus and on hover, without leaving the page. The preview SHALL close on
escape and on blur and SHALL NOT trap focus. Each referenced record SHALL
be fetched at most once per page. A reference to a record the user may
not read SHALL render plainly, with no preview and no request.

#### Scenario: The summary without the round trip

- **GIVEN** a case note referencing another case
- **WHEN** the handler focuses the reference
- **THEN** a summary of that case appears in place and escape closes it

#### Scenario: Forty references, not forty requests

- **GIVEN** a list with forty references to the same twelve records
- **WHEN** the user moves the pointer across all forty
- **THEN** at most twelve requests are made

#### Scenario: A reference to a record you may not read

- **GIVEN** a reference to a case outside the user's access
- **WHEN** they focus it
- **THEN** no preview opens and no request is made

### Requirement: A person orders their own lists and their own navigation

A list SHALL accept a manual row order, dragged by the user and held per
user and per list. The order SHALL NOT be written onto the records. The
navigation entries of the shared lists SHALL be reorderable per user.
Both orders SHALL be operable from the keyboard.

#### Scenario: Two users, one shared list, two orders

- **GIVEN** a shared list two users have each dragged into their own order
- **WHEN** each opens the list
- **THEN** each sees their own order and neither sees the other's

#### Scenario: The order is not on the record

- **GIVEN** a user who has ordered a list by hand
- **WHEN** the records are exported
- **THEN** the export carries no ordering field

### Requirement: A person sets how the product opens for them

A user SHALL be able to set their landing page, their pinned navigation
entries, their date display and the view each record type opens on. These
SHALL be stored in Nextcloud personal settings, not in a component store.
An app default, an administered value and a personal value SHALL resolve
in that order. An instance setting that turns personal customisation off
SHALL collapse the personal layer and SHALL say so in the interface. A
relative date SHALL always carry its absolute date in its accessible name
and its tooltip.

#### Scenario: A caseworker opens where they work

- **GIVEN** a user who has set their landing page to the queue
- **WHEN** they open the app
- **THEN** the queue renders

#### Scenario: The last used view comes back

- **GIVEN** a user who last read cases as a board and tasks as a table
- **WHEN** they return to each list
- **THEN** each opens in the mode they last used

#### Scenario: A relative date never hides the term

- **GIVEN** a user who has chosen relative dates
- **WHEN** a case shows "3 dagen geleden"
- **THEN** the absolute date is in the accessible name and in the tooltip

#### Scenario: Customisation switched off says so

- **GIVEN** an instance with personal customisation switched off
- **WHEN** a user opens their preferences
- **THEN** the personal options are shown as unavailable with the reason, not silently ignored

### Requirement: The detail page is reachable and readable from the keyboard

A detail page SHALL render a skip link, visible on focus, that reaches
the primary action the page declares. A widget SHALL be able to declare
that it is high contrast, exposing the flag to the theme without choosing
any colour itself.

#### Scenario: One key to the primary action

- **GIVEN** a case page whose primary action is "Zaak afhandelen"
- **WHEN** a keyboard user tabs into the page and follows the skip link
- **THEN** focus lands on that action

#### Scenario: The widget declares, the theme decides

- **GIVEN** a widget declaring high contrast
- **WHEN** it renders
- **THEN** the flag reaches the theme and the component sets no colour of its own

@e2e exclude the flag is a declaration read by the theme; covered by the widget unit tests and the theme's own suite.
