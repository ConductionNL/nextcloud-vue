# facts-widget Delta: facts-figures-and-input

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-figures-and-input](../../)

## Purpose

Draw a short set of amounts as figures, warn only when it matters, and let a card's action carry one typed value.

## ADDED Requirements

### Requirement: Tiles can show figures with a note and a tone

A facts widget with `layout: "tiles"` and `tileStyle: "figures"` SHALL draw each fact as a white tile with a plain
label above a large value. A row with `note` SHALL show the note's parts under its value, and a row with `tone` SHALL
colour its value with the variant of the first entry whose condition the record meets.

#### Scenario: A cash shortage

- **GIVEN** a cash difference of -12,40, 3,0%, outside the margin
- **WHEN** the card lists expected, counted and difference as figures, the difference toned error below zero
- **THEN** the difference reads in red with "3,0%, outside the margin" under it

### Requirement: A notice can depend on the record

A `notice` with `visibleWhen` SHALL be shown only while the record shown meets that condition.

#### Scenario: Within the margin

- **GIVEN** a notice shown when `withinTolerance` is false
- **WHEN** the difference is within the margin
- **THEN** no notice is drawn

### Requirement: A facts card can ask for one value its actions send

A facts widget with `input: { key, label, placeholder }` SHALL draw one labelled text field under the facts, and every
`@input.<key>` in its actions SHALL be replaced by the typed text, or by '' when nothing was typed. An input with `visibleWhen` SHALL be drawn only while the record meets it.

#### Scenario: Reject with a reason

- **GIVEN** a reject action whose payload carries `reason: "@input.reason"`
- **WHEN** the reader types "Recount tomorrow"
- **THEN** the action is sent with reason "Recount tomorrow"

### Requirement: A source's sort names a field

A source read by filter SHALL be read when its `sort.field` starts with "@" (such as "@self.created"): the sort is a
field name, not a token to fill.

#### Scenario: Newest difference first

- **GIVEN** a source on cashDiff filtered on the shift and sorted on "@self.created" descending
- **WHEN** the card loads
- **THEN** it requests the first match with `_order[@self.created]=desc`
