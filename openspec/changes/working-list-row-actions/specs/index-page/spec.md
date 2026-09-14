# index-page Delta: working-list-row-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [working-list-row-actions](../../)

## Purpose

A handler does the day's work from the list row: the record's actions, a
quick edit, the indicators that let four hundred cases be triaged, and a
priority that orders the queue. Round 4 discovery cluster 15, eleven
candidates, decision D14. Consumed by dossiq on `#Cases`, `#Queue` and
`#Tasks`.

## ADDED Requirements

### Requirement: A row offers the actions the record offers

An index page SHALL render a row action menu holding the actions the host
returns as available on that record for the calling user. The menu SHALL
NOT offer an action the caller may not run, and SHALL NOT add an action
the page has not declared. The refusal reason for a refused action SHALL
be available on request. Actions SHALL arrive with the list rows in one
call, and only the row whose menu is opened SHALL re-ask.

#### Scenario: Forty cases processed without opening one

- **GIVEN** a case list where the handler may assign, reject and close
- **WHEN** they open a row menu
- **THEN** those three actions are offered and run against that case without opening it

#### Scenario: An action a guard refuses is not offered

- **GIVEN** a case whose case type refuses a decision before advice is filed
- **WHEN** the handler opens the row menu
- **THEN** the decision action is absent, and its refusal reason is available on request

#### Scenario: Ninety rows, one request

- **GIVEN** a list page of ninety rows
- **WHEN** it loads
- **THEN** the available actions arrive with the rows in one call

### Requirement: A field is edited from the row

An index page SHALL be able to open a quick edit over the list for the
fields it names, rendering the same form widgets the detail page renders.
A field the caller may not write SHALL NOT be editable. Saving SHALL
replace that row in place and SHALL keep the list's scroll position. A
save against a row another user has changed SHALL show both values and
SHALL overwrite nothing.

#### Scenario: One field, no round trip

- **GIVEN** a handler triaging ninety cases who needs to set the afdeling
- **WHEN** they quick edit that field from the row and save
- **THEN** the row updates in place and the list keeps its position

#### Scenario: A field you may not write

- **GIVEN** a field the caller has read access to only
- **WHEN** the quick edit opens
- **THEN** the field renders read-only

#### Scenario: Two handlers, one row

- **GIVEN** a row a colleague changed after the list loaded
- **WHEN** the handler saves a quick edit on it
- **THEN** both values are shown, nothing is overwritten, and the handler chooses

### Requirement: A row shows the state indicators the page declares

An index page SHALL accept `rowIndicators`, each declaring a field, a
condition, an icon and a text. Each indicator SHALL render with a text
alternative and a tooltip, and SHALL NOT rely on colour alone. Beyond the
declared cap, the remaining indicators SHALL move into the row menu. A
page declaring no indicators SHALL render its rows as today.

#### Scenario: Suspension, extension, hierarchy and a decision, at a glance

- **GIVEN** a case list declaring those four indicators
- **WHEN** a suspended case with a decision renders
- **THEN** two icons appear on the row, each with its text alternative

#### Scenario: Colour is never the only signal

- **GIVEN** a user who cannot distinguish the indicator colours
- **WHEN** the row renders
- **THEN** every indicator is identifiable from its icon and its text alternative

### Requirement: The list sorts and colours on a priority it reads

An index page SHALL render the derived priority a record carries as a
chip, and SHALL offer it as a sort. The list SHALL NOT compute a
priority. A record with no priority SHALL sort last under a descending
priority sort and SHALL stay visible. The chip's colour SHALL come from
the schema's own enum colour.

#### Scenario: The queue sorts by what matters

- **GIVEN** cases carrying a priority derived from impact and urgency
- **WHEN** a handler sorts the list by priority, descending
- **THEN** the highest priority cases are first and the chip shows the value

#### Scenario: A case with no priority is not hidden

- **GIVEN** a case with no priority value
- **WHEN** the list is sorted by priority descending
- **THEN** it appears at the end of the list

#### Scenario: The list does not invent a priority

- **GIVEN** a record whose priority field is absent from the response
- **WHEN** the row renders
- **THEN** no chip renders and no value is computed in the component

### Requirement: The page renders its lenses as tabs

An index page SHALL be able to name saved views that render as tabs
instead of as entries in the views control. A view SHALL appear as a tab
or in the control, never in both. A lens whose criteria read the user's
claimed teams and subjects SHALL narrow every list it applies to, and the
claimed teams SHALL be a personal preference stored with the others.

#### Scenario: All, mine and unassigned on one page

- **GIVEN** a case list naming three views as tabs
- **WHEN** the page renders
- **THEN** three tabs render over one list, each with its own view criteria

#### Scenario: A caseworker in three teams sees three teams

- **GIVEN** a user who has claimed three teams
- **WHEN** they open the lens narrowed to their teams
- **THEN** the list holds the cases of all three and nothing else

### Requirement: A record type has its own list page and a count

The host SHALL be able to declare a list page and a navigation entry per
record type, each carrying a count. The count SHALL come from the list's
own count query and SHALL refresh when the list does. A count the page
cannot confirm SHALL be absent rather than stale. These entries SHALL
count against the app's navigation budget.

#### Scenario: Thirty case types, thirty lists

- **GIVEN** an app declaring a list page per case type
- **WHEN** the navigation renders
- **THEN** each type has an entry with its own list and a count

#### Scenario: An unconfirmed count says nothing

- **GIVEN** a list whose count query failed
- **WHEN** the navigation renders
- **THEN** the entry renders with no count, not with the previous one

### Requirement: The repeated actions run from the keyboard and are discoverable

The list SHALL offer keyboard shortcuts for moving between rows, opening
a record, running its primary action, quick editing, selecting and
running a bulk action. Every shortcut SHALL be listed in the command
palette and reachable from a help key on the list, and SHALL be written
into the component reference.

#### Scenario: Sixty cases a day, from the keyboard

- **GIVEN** a handler on a case list
- **WHEN** they move down three rows, open the row menu and run the primary action, using only the keyboard
- **THEN** each step works and focus stays where the user can see it

#### Scenario: A shortcut nobody can find does not count

- **GIVEN** a handler who has never used the list
- **WHEN** they press the help key
- **THEN** every shortcut the list offers is listed
