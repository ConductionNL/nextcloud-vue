## Purpose

The building blocks of a workplace dashboard and working list: a week of
dated items, one segmented bar with a legend, an attention card, a greeting,
a segmented view switch, counts on filters and views, person and deadline
table cells, and the brand stripe.

## ADDED Requirements

### Requirement: Week strip widget

The library SHALL register a `week-strip` dashboard widget that renders one
column per day of the current week (5 working days by default, 7 when
configured) and lists in each column the items whose date field falls on that
day. Items come from an OpenRegister source or from static `items`.

#### Scenario: Five working days by default
- **GIVEN** a `week-strip` widget with no `days` setting
- **WHEN** it renders
- **THEN** it shows five columns, Monday to Friday of the current week

#### Scenario: Today is highlighted
- **GIVEN** today is one of the rendered days
- **WHEN** the widget renders
- **THEN** that column carries a visible "today" badge and `aria-current="date"`

#### Scenario: Late items are marked
- **GIVEN** an item whose date is before today, or whose `late` flag is true
- **WHEN** the widget renders
- **THEN** the item carries a late marker that is conveyed in text, not by colour alone

#### Scenario: An empty day says so
- **GIVEN** a day with no items
- **WHEN** the widget renders
- **THEN** that column shows the configured empty text

#### Scenario: Items are links
- **GIVEN** an item with a `route`
- **WHEN** the widget renders
- **THEN** the item is a link a keyboard user can reach and follow

#### Scenario: Narrow screens scroll sideways
- **GIVEN** a container narrower than the columns need
- **WHEN** the widget renders
- **THEN** the strip scrolls horizontally inside a focusable, labelled region

### Requirement: Stacked bar widget

The library SHALL register a `stacked-bar` dashboard widget that renders one
segmented bar and, below it, a legend with a label and a count per segment.
Segments come from one grouped count request against an OpenRegister source
or from static `segments`.

#### Scenario: The legend carries the numbers
- **GIVEN** segments with counts
- **WHEN** the widget renders
- **THEN** every segment's label and count are in the legend and the bar is `aria-hidden`

#### Scenario: Segment order is configurable
- **GIVEN** `order: ["intake", "review", "decision"]`
- **WHEN** the grouped counts arrive in another order
- **THEN** the segments render in the declared order, with unlisted groups after them

#### Scenario: Colours differ in lightness
- **GIVEN** more than one segment
- **WHEN** the widget renders
- **THEN** each segment gets a step of one token-based ramp that differs in lightness, never in hue alone

#### Scenario: One request
- **GIVEN** a source with `groupBy`
- **WHEN** the widget loads
- **THEN** it makes one grouped aggregation request, not one per segment

### Requirement: Attention card

`CnBannerWidget` SHALL support `layout: "attention"`: a card with a coloured
edge by severity, a kicker label, a title, a reason line and at most two
actions (primary and secondary). `visibleWhen` works as it does for the
banner. Without `layout`, the banner renders as before.

#### Scenario: Default stays the banner
- **GIVEN** a banner with only `text` and `variant`
- **WHEN** it renders
- **THEN** it renders the note card it always rendered

#### Scenario: Two actions at most
- **GIVEN** an attention card with three actions
- **WHEN** it renders
- **THEN** only the first two render, the first as primary

#### Scenario: Hidden until the condition holds
- **GIVEN** an attention card with a `visibleWhen` that is not met
- **WHEN** it renders
- **THEN** nothing renders

### Requirement: Greeting header

`CnHeaderWidget` SHALL optionally render a greeting (time of day plus the
current user's display name) and a line with the current date.

#### Scenario: Greeting by time of day
- **GIVEN** `greeting: true` at 14:00 and a user named Pieter
- **WHEN** the header renders
- **THEN** the title reads "Good afternoon, Pieter"

#### Scenario: Unchanged without the options
- **GIVEN** a header with neither `greeting` nor `showDate`
- **WHEN** it renders
- **THEN** it renders as before

### Requirement: Segmented control

The library SHALL provide `CnSegmentedControl`, a single-choice switch with
radio-group semantics and arrow-key navigation, and `CnTabs` SHALL accept
`variant="segmented"` to draw its strip in the same style.

#### Scenario: Radio semantics
- **GIVEN** a segmented control with two options
- **WHEN** it renders
- **THEN** it is a `radiogroup` with two `radio` children, one `aria-checked="true"`

#### Scenario: Arrow keys move the choice
- **GIVEN** focus on the checked option
- **WHEN** the user presses the right arrow
- **THEN** the next enabled option is checked, focused, and emitted

### Requirement: Counts on filters and views

`CnQuickFilterBar` chips and `CnSavedViewsControl` entries SHALL show a count
when one is supplied. `CnIndexPage` SHALL fetch counts only for entries that
opt in with `showCount`, using one grouped request for entries that filter the
same single field and one count request for each remaining entry.

#### Scenario: Opt-in
- **GIVEN** quick filters without `showCount`
- **WHEN** the index page loads
- **THEN** no count request is made and no count renders

#### Scenario: One grouped request
- **GIVEN** three quick filters `{ status: "open" }`, `{ status: "closed" }`, `{ status: "hold" }` with `showCount`
- **WHEN** the index page loads
- **THEN** it makes one grouped request for `status` and shows three counts

#### Scenario: The count is read aloud
- **GIVEN** a chip with a count
- **WHEN** a screen reader reads it
- **THEN** it hears the label and the count

### Requirement: Avatar and date cells

`CnCellRenderer` SHALL provide the built-in cell widgets `avatar` (an avatar
with a name, for a user id or a free name with an initials fallback) and
`date` (a date whose colour follows `variantWhen` rules on the number of days
until that date). The rule evaluation SHALL live in a shared utility.

#### Scenario: Free name falls back to initials
- **GIVEN** an avatar cell whose value is "Pieter de Vries" and no user id
- **WHEN** it renders
- **THEN** it shows the initials "PV" next to the name

#### Scenario: Overdue is error coloured
- **GIVEN** a date cell with `variantWhen: [{ op: "lt", value: 0, variant: "error" }]` and a date in the past
- **WHEN** it renders
- **THEN** the cell carries the error variant

#### Scenario: Within N days is warning coloured
- **GIVEN** `variantWhen: [{ op: "lt", value: 0, variant: "error" }, { op: "lte", value: 5, variant: "warning" }]` and a date three days ahead
- **WHEN** it renders
- **THEN** the cell carries the warning variant

### Requirement: Brand stripe

The library SHALL provide `CnBrandStripe`, a decorative stripe of up to three
bands whose colours, ratios and height come from the thematiq tokens
`--nldesign-brand-stripe-color-1/2/3`, `--nldesign-brand-stripe-ratio-1/2/3`
and `--nldesign-brand-stripe-height`, with fallbacks to Nextcloud variables.

#### Scenario: Decorative
- **GIVEN** a brand stripe
- **WHEN** it renders
- **THEN** it is hidden from the accessibility tree

#### Scenario: Works without the theme
- **GIVEN** no thematiq tokens are set
- **WHEN** it renders
- **THEN** it draws a stripe in the Nextcloud primary colour
